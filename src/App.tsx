/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Zap, 
  Image as ImageIcon, 
  Upload, 
  Copy, 
  Check, 
  Download, 
  Loader2, 
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Service (Local Storage Based) ---
interface LocalUser {
  displayName: string;
  email: string;
  photoURL?: string;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = window.localStorage.getItem('flash_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (name: string, email: string) => {
    const newUser = { 
      displayName: name, 
      email: email,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
    setUser(newUser);
    window.localStorage.setItem('flash_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem('flash_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// --- AI Service ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function extractTextFromImage(base64Data: string, mimeType: string): Promise<string> {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Extract all text and symbols from this image with extreme accuracy. Transcribe every single character, including punctuation, mathematical symbols, special characters, and formatting markers, exactly as seen. Maintain the original layout and structure. If the text is Arabic, pay extreme attention to diacritics and rare characters. Do not miss any small detail or faint symbol. Provide ONLY the text." },
          { inlineData: { data: base64Data, mimeType } }
        ]
      },
      config: {
        temperature: 0,
        topP: 0.1,
        topK: 1,
      }
    });
    
    if (!response.text) {
      throw new Error("لم يستطع النموذج العثور على أي نص في هذه الصورة.");
    }
    
    return response.text;
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    if (error.message?.includes("safety")) {
      throw new Error("عذراً، تعذر استخراج النص بسبب قيود سياسة السلامة.");
    }
    throw new Error(`فشل استخراج النص من الصورة: ${error.message || "خطأ غير معروف"}`);
  }
}

async function extractTextFromPDFPages(images: { data: string; mimeType: string }[]): Promise<string> {
  try {
    const contentParts = images.map(img => ({
      inlineData: { data: img.data, mimeType: img.mimeType }
    }));

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "You are a master-level OCR engine specializing in symbol-dense documents. Extract all text and symbols from these PDF pages with absolute fidelity. Ensure every special character, mathematical symbol, and punctuation mark is preserved. If parts are in Arabic, focus on perfect character calibration and right-to-left flow. Synthesize everything into a single document while strictly maintaining logical indentation and structure. Provide only the raw extracted content without meta-talk." },
          ...contentParts
        ]
      },
      config: {
        temperature: 0,
        topP: 0.1,
        topK: 1,
      }
    });
    
    if (!response.text) {
      throw new Error("لم يستطع النموذج العثور على أي نص في ملف الـ PDF.");
    }
    
    return response.text;
  } catch (error: any) {
    console.error("Gemini PDF OCR Error:", error);
    if (error.message?.includes("safety")) {
      throw new Error("عذراً، تعذر استخراج النص بسبب قيود سياسة السلامة.");
    }
    throw new Error(`فشل استخراج النص من ملف PDF: ${error.message || "خطأ غير معروف"}`);
  }
}

// --- Parsers ---
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

async function parseWordFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (!result.value || result.value.trim() === "") {
      throw new Error("لم يتم العثور على نص في ملف DOCX.");
    }
    return result.value;
  } catch (error: any) {
    console.error("Mammoth Error:", error);
    throw new Error(`فشل استخراج النص من ملف DOCX: ${error.message || "خطأ غير معروف"}`);
  }
}

async function pdfToImages(file: File): Promise<{ data: string; mimeType: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  if (pdf.numPages > 10) {
    throw new Error(`عذراً، الحد الأقصى المسموح به هو 10 صفحات لكل ملف. ملفك يحتوي على ${pdf.numPages} صفحة.`);
  }

  const images: { data: string; mimeType: string }[] = [];
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 3.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      const base64 = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
      images.push({ data: base64, mimeType: "image/jpeg" });
    }
  }
  return images;
}

// --- Main Components ---

function AppContent() {
  const { user, login, logout, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLocalSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    
    // محاكاة تحميل بسيطة لشكل احترافي
    setTimeout(() => {
      login(authName, authEmail);
      setIsAuthLoading(false);
      setShowAuthModal(false);
    }, 800);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResult('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  } as any);

  const processFile = async () => {
    if (!file) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // تقدير الوقت: حوالي 3 ثواني لكل صفحة أو صورة
    let timeEstimate = 3; 
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        timeEstimate = pdf.numPages * 3;
      } catch (e) {
        timeEstimate = 10;
      }
    } else if (file.type.includes('wordprocessingml')) {
      timeEstimate = 5;
    }
    setEstimatedTime(timeEstimate);

    try {
      let extractedText = '';

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        extractedText = await extractTextFromImage(base64, file.type);
      } else if (file.type === 'application/pdf') {
        const pageImages = await pdfToImages(file);
        extractedText = await extractTextFromPDFPages(pageImages);
      } else if (file.type.includes('wordprocessingml')) {
        extractedText = await parseWordFile(file);
      }

      setResult(extractedText);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء معالجة الملف.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileData = new Blob([result], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileData);
    element.download = `${file?.name.split('.')[0] || 'extracted_text'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-body font-sans selection:bg-brand-primary/10 relative" dir="rtl">
      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-brand-bg/95 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-8"
          >
            <div className="w-20 h-20 bg-brand-accent rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Zap className="w-10 h-10 text-brand-primary fill-brand-primary/10 animate-pulse" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-brand-text-heading italic leading-relaxed">بسم الله الرحمن الرحيم</h2>
              <p className="text-brand-text-muted font-medium">مرحباً بك في فلاش - رفيقك الذكي لاستخراج النصوص</p>
            </div>
            <button 
              onClick={() => setShowWelcome(false)}
              className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold text-xl hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20 transition-all transform active:scale-95"
            >
              تم
            </button>
          </motion.div>
        </div>
      )}

      {/* Background Decorations */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-30 pointer-events-none z-0 will-change-transform"></div>
      <div className="fixed top-24 -right-24 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-30 pointer-events-none z-0 will-change-transform"></div>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-brand-bg/80 backdrop-blur-md px-6 md:px-12 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/40 animate-pulse">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading italic">فلاش</h1>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-brand-text-muted">
            <a href="#" className="hover:text-brand-primary transition-colors">الرئيسية</a>
            <a href="#how-it-works" className="hover:text-brand-primary transition-colors">كيف يعمل؟</a>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-accent rounded-full border border-brand-border/50">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-brand-primary/20">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-brand-text-heading font-bold text-xs">{user.displayName}</span>
                </div>
                <button 
                  onClick={logout}
                  className="hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-tighter"
                >
                  خروج
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                disabled={loading}
                className="hover:text-brand-primary transition-colors text-brand-text-heading border-b-2 border-brand-primary/30 disabled:opacity-50"
              >
                {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-brand-text-heading/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden p-8"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 left-6 p-2 hover:bg-brand-accent rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-brand-text-muted" />
              </button>

              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-brand-primary fill-brand-primary/10" />
                </div>
                <h3 className="text-2xl font-bold text-brand-text-heading italic">مرحباً بك في فلاش</h3>
                <p className="text-brand-text-muted text-sm px-4">أدخل بياناتك للبدء في استخراج النصوص فوراً</p>
              </div>

              <div className="space-y-6">
                <form onSubmit={handleLocalSignIn} className="space-y-4 text-right">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-text-heading mr-1">الاسم الكامل</label>
                    <input 
                      required
                      type="text" 
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="أدخل اسمك هنا"
                      className="w-full px-5 py-4 bg-brand-accent/30 border border-brand-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-brand-text-heading mr-1">البريد الإلكتروني</label>
                    <input 
                      required
                      type="email" 
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className="w-full px-5 py-4 bg-brand-accent/30 border border-brand-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-right"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'دخول سريع'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacyModal(false)}
              className="absolute inset-0 bg-brand-text-heading/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-brand-border/30 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-brand-text-heading italic flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-brand-primary" />
                  سياسة الخصوصية
                </h3>
                <button 
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-2 hover:bg-brand-accent rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-brand-text-muted" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8 text-right custom-scrollbar">
                <section className="space-y-3">
                  <h4 className="font-bold text-brand-text-heading text-lg">1. جمع البيانات ومعالجتها</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    نحن في "فلاش" نستخدم تقنيات الذكاء الاصطناعي (Gemini API) لمعالجة الصور والملفات التي ترفعها. نحن لا نقوم بتخزين هذه الملفات بشكل دائم على خوادمنا؛ بل يتم تحليلها في الوقت الفعلي وحذف البيانات المؤقتة فور انتهاء عملية الاستخراج.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-brand-text-heading text-lg">2. الحساب الشخصي</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    البيانات التي تدخلها (الاسم والبريد الإلكتروني) تُستخدم فقط لإنشاء جلسة عمل محلية (Local Session) على متصفحك لتحسين تجربة الاستخدام. نحن لا نشارك هذه البيانات مع أي أطراف ثالثة لأغراض تسويقية.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-brand-text-heading text-lg">3. أمان الملفات</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    عملية انتقال الملفات من جهازك إلى خوادم المعالجة تتم عبر بروتوكولات مشفرة وآمنة تماماً. نضمن لك خصوصية محتوى مستنداتك وعدم اطلاع أي عنصر بشري عليها.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-brand-text-heading text-lg">4. حقوق المستخدم</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    لك كامل الحق في حذف بيانات جلسة العمل الخاصة بك في أي وقت عبر تسجيل الخروج من الموقع، مما سيؤدي إلى مسح معلوماتك من التخزين المحلي لمتصفحك فوراً.
                  </p>
                </section>

                <div className="bg-brand-accent/30 p-6 rounded-2xl border border-brand-primary/10">
                  <p className="text-brand-text-heading font-medium text-sm">
                    باستخدامك لموقع فلاش، فإنك توافق على شروط معالجة البيانات المذكورة أعلاه لغرض تسهيل استخراج النصوص.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-brand-accent/10 border-t border-brand-border/30 text-center">
                <button 
                  onClick={() => setShowPrivacyModal(false)}
                  className="bg-brand-primary text-white px-12 py-3 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all"
                >
                  فهمت ذلك
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">

        <div className="w-full space-y-16">
          {/* Hero Section */}
          <section className="text-center space-y-6">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-text-heading italic"
            >
              استخرج نصوصك بسرعة <span className="text-brand-primary underline decoration-brand-primary/20 transition-all hover:decoration-brand-primary">البرق</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-brand-text-muted max-w-2xl mx-auto leading-relaxed"
            >
              حوّل الصور والملفات إلى نصوص بدقة فائقة وفورية تماماً مثل الفلاش.
            </motion.p>
          </section>

          {/* Upload Section */}
          <section className="w-full max-w-3xl mx-auto">
            {!file ? (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.995 }}
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-[40px] p-8 md:p-16 transition-all cursor-pointer text-center space-y-8 group relative overflow-hidden",
                  isDragActive 
                    ? "border-brand-primary bg-brand-primary/5 shadow-inner" 
                    : "border-brand-border bg-white/60 hover:border-brand-primary/50 hover:bg-white/80"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-20 h-20 md:w-24 md:h-24 bg-brand-accent rounded-full flex items-center justify-center mx-auto group-hover:bg-red-100 transition-colors shadow-sm">
                  <Zap className="w-10 h-10 md:w-12 md:h-12 text-brand-primary fill-brand-primary/10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl md:text-2xl font-bold text-brand-text-heading italic px-4">ارفع الملفات وهتلاقيها نصوص في غمضة عين</h3>
                  <p className="text-sm md:text-base text-brand-text-muted font-medium">JPG, PNG, PDF, DOCX (حتى 10 صفحات)</p>
                  <div className="inline-block mt-4">
                    <span className="bg-brand-primary text-white px-8 py-3 md:px-10 md:py-4 rounded-full font-bold text-base md:text-lg shadow-lg shadow-brand-primary/20 group-hover:bg-brand-primary-hover transition-all">
                      اختر الملفات من جهازك
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-sm border border-brand-border rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-brand-primary/5"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center shadow-inner">
                    {file.type.includes('image') ? <ImageIcon className="w-8 h-8 text-brand-primary" /> : <FileText className="w-8 h-8 text-brand-primary" />}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-brand-text-heading truncate max-w-[200px]">{file.name}</p>
                    <p className="text-brand-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button 
                    onClick={() => {
                      setFile(null);
                      setResult("");
                      setError(null);
                    }}
                    className="p-4 hover:bg-red-50 text-red-400 rounded-2xl transition-colors border border-transparent hover:border-red-100"
                    title="إلغاء الملف"
                  >
                    <X className="w-6 h-6" />
                  </button>
                    <button
                      disabled={isLoading}
                      onClick={processFile}
                      className="flex-1 md:flex-none bg-brand-primary text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-primary-hover disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-brand-primary/20"
                    >
                      <div className="flex items-center gap-3">
                        {isLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : !user ? (
                          'سجل الدخول للمعالجة'
                        ) : (
                          'ابدأ المعالجة'
                        )}
                      </div>
                      {isLoading && estimatedTime && (
                        <span className="text-[10px] opacity-80 font-medium">
                          الوقت المتوقع: {estimatedTime} ثوانٍ تقريباً
                        </span>
                      )}
                    </button>
                </div>
              </motion.div>
            )}
          </section>

          {/* Results Section */}
          <AnimatePresence>
            {(result || error) && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-4xl mx-auto space-y-8"
              >
                {error ? (
                  <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-[24px] p-8 flex items-start gap-5 text-red-800 shadow-sm">
                    <AlertCircle className="w-8 h-8 shrink-0 text-red-400" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg">حدث خطأ</h4>
                      <p className="font-medium text-red-700/80 leading-relaxed">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-md border border-brand-border rounded-[40px] shadow-2xl shadow-brand-primary/5 overflow-hidden">
                    <div className="border-b border-brand-border/30 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/40">
                      <h3 className="font-bold text-xl text-brand-text-heading flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                        النص المستخرج
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-2 px-6 py-3 hover:bg-brand-accent rounded-full transition-all text-sm font-bold border border-brand-border/50 text-brand-text-heading"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'تم النسخ' : 'نسخ'}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-full transition-all text-sm font-bold shadow-md shadow-brand-primary/10 hover:bg-brand-primary-hover"
                        >
                          <Download className="w-4 h-4" />
                          تحميل TXT
                        </button>
                      </div>
                    </div>
                    <div className="p-8 md:p-12">
                      <div className="bg-brand-bg/30 rounded-3xl p-6 border border-brand-border/20">
                        <pre className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-brand-text-body">
                          {result}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Features Row */}
          {!result && !error && !isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mx-auto pt-8">
              <div className="bg-white/40 p-8 rounded-[32px] border border-white/60 flex items-center gap-5 shadow-sm hover:translate-y-[-4px] transition-transform">
                <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-brand-primary font-bold text-lg">01</span>
                </div>
                <div>
                  <h4 className="font-bold text-brand-text-heading text-lg">دقة ذكاء اصطناعي</h4>
                  <p className="text-sm text-brand-text-muted">التعرف المتقدم على الحروف العربية</p>
                </div>
              </div>
              <div className="bg-white/40 p-8 rounded-[32px] border border-white/60 flex items-center gap-5 shadow-sm hover:translate-y-[-4px] transition-transform">
                <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-brand-primary font-bold text-lg">02</span>
                </div>
                <div>
                  <h4 className="font-bold text-brand-text-heading text-lg">تحويل متعدد</h4>
                  <p className="text-sm text-brand-text-muted">دعم كامل لملفات وورد وبي دي اف</p>
                </div>
              </div>
              <div className="bg-white/40 p-8 rounded-[32px] border border-white/60 flex items-center gap-5 shadow-sm hover:translate-y-[-4px] transition-transform">
                <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-brand-primary font-bold text-lg">03</span>
                </div>
                <div>
                  <h4 className="font-bold text-brand-text-heading text-lg">أمان تام</h4>
                  <p className="text-sm text-brand-text-muted">تشفير وحذف تلقائي للملفات</p>
                </div>
              </div>
            </div>
          )}

          {/* How It Works Section */}
          <section id="how-it-works" className="w-full max-w-5xl mx-auto py-20 border-t border-brand-border/20">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-brand-text-heading italic mb-4">كيف يعمل فلاش؟</h3>
              <p className="text-brand-text-muted">ثلاث خطوات بسيطة تفصلك عن نصك المستخرج</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Decorative Arrows for Desktop */}
              <div className="hidden md:block absolute top-1/2 left-1/3 w-1/4 h-px bg-dashed bg-brand-primary/20 -translate-y-1/2"></div>
              <div className="hidden md:block absolute top-1/2 right-1/3 w-1/4 h-px bg-dashed bg-brand-primary/20 -translate-y-1/2"></div>

              <div className="flex flex-col items-center text-center space-y-6 relative z-1">
                <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
                  <Upload className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xl text-brand-text-heading">1. ارفع ملفك</h4>
                  <p className="text-brand-text-muted text-sm leading-relaxed">اسحب الصورة أو ملف الـ PDF وألقهِ في منطقة الرفع المخصصة.</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-6 relative z-1">
                <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center shadow-lg transform -rotate-2">
                  <Loader2 className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xl text-brand-text-heading">2. معالجة ذكية</h4>
                  <p className="text-brand-text-muted text-sm leading-relaxed">يقوم الذكاء الاصطناعي (Gemini) بتحليل الملف واستخراج النصوص بدقة.</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-6 relative z-1">
                <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center shadow-lg transform rotate-6">
                  <Copy className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xl text-brand-text-heading">3. انسخ الملف</h4>
                  <p className="text-brand-text-muted text-sm leading-relaxed">بضغطة زر واحدة، يمكنك نسخ النص أو تحميله كملف نصي جاهز.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-12 py-10 border-t border-brand-border/30 mt-20 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] text-brand-text-muted uppercase tracking-widest font-bold">
        <span>© {new Date().getFullYear()} فلاش للتقنيات</span>
        <div className="flex gap-10">
          <span 
            onClick={() => setShowPrivacyModal(true)}
            className="hover:text-brand-primary cursor-pointer transition-colors"
          >
            سياسة الخصوصية
          </span>
          <a 
            href="mailto:amrhnfy869@gmail.com"
            className="hover:text-brand-primary cursor-pointer transition-colors"
          >
            اتصل بنا: amrhnfy869@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
