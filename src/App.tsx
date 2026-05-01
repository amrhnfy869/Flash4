/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Download, 
  Loader2, 
  AlertCircle,
  X,
  ArrowRightLeft,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    const savedUser = window.localStorage.getItem('faseeh_user');
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
    window.localStorage.setItem('faseeh_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem('faseeh_user');
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
const getGenAI = () => {
  // Try to get the API key from various possible sources
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY ||
                 (import.meta as any).env?.GEMINI_API_KEY ||
                 "";

  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.trim() === "") {
    throw new Error("عذراً، مفتاح API غير موجود. يرجى التأكد من إعداد GEMINI_API_KEY في إعدادات البيئة الخاصة بك.");
  }
  
  return new GoogleGenAI({ apiKey });
};

// --- Main Components ---

function AppContent() {
  const { user, login, logout, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [result, setResult] = useState<string>('');
  const [sourceText, setSourceText] = useState<string>('');
  const [mode, setMode] = useState<'translate' | 'proofread'>('translate');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ name: string; date: string; content: string }[]>([]);
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('ar');

  const languages = [
    { code: 'auto', name: 'تعرف تلقائي' },
    { code: 'ar', name: 'العربية' },
    { code: 'en', name: 'الإنجليزية' },
    { code: 'fr', name: 'الفرنسية' },
    { code: 'de', name: 'الألمانية' },
    { code: 'es', name: 'الإسبانية' },
    { code: 'tr', name: 'التركية' },
    { code: 'zh', name: 'الصينية' },
  ];

  useEffect(() => {
    const savedHistory = window.localStorage.getItem('faseeh_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const addToHistory = (name: string, content: string) => {
    const newItem = {
      name,
      content,
      date: new Date().toLocaleString('ar-EG')
    };
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    window.localStorage.setItem('faseeh_history', JSON.stringify(newHistory));
  };
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

  const translateSourceText = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult('');
    try {
      const genAI = getGenAI();
      let prompt = "";
      if (mode === 'translate') {
        const sourceLangName = languages.find(l=>l.code===sourceLang)?.name;
        const targetLangName = languages.find(l=>l.code===targetLang)?.name;
        prompt = `Translate the following text from ${sourceLang === 'auto' ? 'the detected language' : sourceLangName} into ${targetLangName}. Maintain the professional tone and nuances. Provide ONLY the translated text.\n\nText:\n${sourceText}`;
      } else {
        prompt = `Please proofread the following text for grammar, spelling, and style. Provide the corrected version in the same language. Provide ONLY the corrected text, no explanations or markers.\n\nText:\n${sourceText}`;
      }

      const response = await (genAI as any).models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { text: prompt }
          ]
        },
        config: {
          temperature: 0.3,
        }
      });
      if (!response.text) throw new Error(mode === 'translate' ? "فشل الحصول على ترجمة." : "فشل معالجة النص.");
      setResult(response.text);
      addToHistory(mode === 'translate' ? "ترجمة نص" : "تدقيق لغوي", response.text);
    } catch (err: any) {
      setError(err.message || (mode === 'translate' ? "حدث خطأ أثناء الترجمة." : "حدث خطأ أثناء التدقيق."));
    } finally {
      setIsLoading(false);
    }
  };

  const swapLanguages = () => {
    if (sourceLang === 'auto') return;
    const s = sourceLang;
    const t = targetLang;
    setSourceLang(t);
    setTargetLang(s);
  };

  const [showHistory, setShowHistory] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileData = new Blob([result], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileData);
    element.download = `faseeh_result_${new Date().getTime()}.txt`;
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
              <p className="text-brand-text-muted font-medium">مرحباً بك في فلاش - رفيقك الذكي للترجمة الفورية</p>
            </div>
            <button 
              onClick={() => setShowWelcome(false)}
              className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold text-xl hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20 transition-all transform active:scale-95"
            >
              ابدأ الآن
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
          <nav className="hidden md:flex gap-8 text-sm font-medium text-brand-text-muted items-center">
            <a href="#" className="hover:text-brand-primary transition-colors">الرئيسية</a>
            <a href="#how-it-works" className="hover:text-brand-primary transition-colors">كيف يعمل؟</a>
            {user ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-bold",
                    showHistory ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "hover:bg-brand-accent text-brand-text-muted hover:text-brand-primary"
                  )}
                >
                  <Zap className={cn("w-4 h-4", showHistory ? "fill-white" : "")} />
                  السجل
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-brand-border/30">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-brand-primary/20 shadow-sm">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName || ''} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    onClick={logout}
                    className="hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-wider"
                  >
                    خروج
                  </button>
                </div>
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
                  <h4 className="font-bold text-brand-text-heading text-lg">1. معالجة البيانات</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    نحن في "فلاش" نستخدم تقنيات الذكاء الاصطناعي (Gemini API) لمعالجة النصوص التي تدققها أو تترجمها. نحن لا نقوم بتخزين هذه النصوص بشكل دائم على خوادمنا؛ بل يتم تحليلها في الوقت الفعلي وحذف البيانات المؤقتة فور انتهاء العملية.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-brand-text-heading text-lg">2. الحساب الشخصي</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    البيانات التي تدخلها (الاسم والبريد الإلكتروني) تُستخدم فقط لإنشاء جلسة عمل محلية (Local Session) على متصفحك لتحسين تجربة الاستخدام. نحن لا نشارك هذه البيانات مع أي أطراف ثالثة لأغراض تسويقية.
                  </p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-brand-text-heading text-lg">3. أمان النصوص</h4>
                  <p className="text-brand-text-muted leading-relaxed">
                    عملية انتقال النصوص من جهازك إلى خوادم المعالجة تتم عبر بروتوكولات مشفرة وآمنة تماماً. نضمن لك خصوصية محتواك وعدم اطلاع أي عنصر بشري عليه.
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
                    باستخدامك لموقع فلاش، فإنك توافق على شروط معالجة البيانات المذكورة أعلاه لغرض المساعدة في الترجمة والمعالجة.
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
          {/* Header Section */}
          <section className="w-full max-w-4xl mx-auto space-y-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-6 py-2 bg-brand-accent/50 rounded-full border border-brand-primary/20"
              >
                <Zap className="w-4 h-4 text-brand-primary animate-pulse" />
                <span className="text-xs font-bold text-brand-primary tracking-widest uppercase italic">فلاش - خدمات لغوية ذكية</span>
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-black text-brand-text-heading italic">
                {mode === 'translate' ? 'ترجمة احترافية ذكية' : 'تدقيق لغوي فائق الذكاء'} <br/>
                <span className="text-brand-primary">في غمضة عين</span>
              </h2>
            </div>

            {/* Service Toggle */}
            <div className="flex justify-center">
              <div className="bg-white/60 backdrop-blur-sm p-1.5 rounded-[24px] border border-brand-border/30 flex shadow-sm w-full max-w-md">
                <button
                  onClick={() => setMode('translate')}
                  className={cn(
                    "flex-1 py-4 rounded-[18px] font-bold text-sm transition-all flex items-center justify-center gap-3 group",
                    mode === 'translate' 
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                      : "text-brand-text-muted hover:bg-brand-accent/50"
                  )}
                >
                  <ArrowRightLeft className={cn("w-4 h-4", mode === 'translate' ? "text-white" : "text-brand-primary")} />
                  ترجمة النصوص
                </button>
                <button
                  onClick={() => setMode('proofread')}
                  className={cn(
                    "flex-1 py-4 rounded-[18px] font-bold text-sm transition-all flex items-center justify-center gap-3 group",
                    mode === 'proofread' 
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                      : "text-brand-text-muted hover:bg-brand-accent/50"
                  )}
                >
                  <Check className={cn("w-4 h-4", mode === 'proofread' ? "text-white" : "text-brand-primary")} />
                  تدقيق لغوي
                </button>
              </div>
            </div>
          </section>

          {/* Language Selection Header */}
          <AnimatePresence mode="wait">
            {mode === 'translate' && (
              <motion.section 
                key="lang-select"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-4xl mx-auto"
              >
                <div className="flex flex-wrap items-center justify-center gap-6 w-full">
                  <div className="flex-1 min-w-[160px] max-w-[200px]">
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-2 text-right tracking-widest">من لغة</p>
                    <select 
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="w-full bg-white border border-brand-border/30 rounded-2xl p-4 text-sm font-bold text-brand-text-heading focus:ring-2 focus:ring-brand-primary/20 appearance-none text-right cursor-pointer shadow-sm"
                    >
                      {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={swapLanguages}
                    className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center shrink-0 mt-6 md:mt-2 hover:bg-brand-primary/10 transition-colors cursor-pointer group active:scale-95"
                  >
                    <ArrowRightLeft className="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="flex-1 min-w-[160px] max-w-[200px]">
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-2 text-right tracking-widest">إلى لغة</p>
                    <select 
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full bg-white border border-brand-border/30 rounded-2xl p-4 text-sm font-bold text-brand-text-heading focus:ring-2 focus:ring-brand-primary/20 appearance-none text-right cursor-pointer shadow-sm"
                    >
                      {languages.filter(l => l.code !== 'auto').map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Translation Section */}
          <section className="w-full max-w-4xl mx-auto">
            {!result && !isLoading && !error ? (
              <div className="w-full">
                {/* Direct Text Translation */}
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-white/60 backdrop-blur-sm border border-brand-border/30 rounded-[40px] p-8 md:p-12 space-y-8 flex flex-col shadow-lg"
                 >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                      {mode === 'translate' ? <Zap className="w-6 h-6 text-brand-primary" /> : <Check className="w-6 h-6 text-brand-primary" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-text-heading text-xl">
                        {mode === 'translate' ? 'ترجمة النص المباشر' : 'التدقيق اللغوي الذكي'}
                      </h3>
                      <p className="text-xs text-brand-text-muted font-medium">
                        {mode === 'translate' ? 'اكتب أو الصق ما تريد ترجمته بالأسفل' : 'اكتب أو الصق النص الذي ترغب في تدقيقه'}
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder={mode === 'translate' ? "ادخل النص هنا..." : "ادخل نصك هنا للمراجعة اللغوية..."}
                    className="flex-1 w-full min-h-[250px] bg-white/40 border border-brand-border/10 rounded-3xl p-8 text-lg text-brand-text-body placeholder:text-brand-text-muted/50 resize-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-right leading-relaxed"
                    dir="auto"
                  />
                  <button
                    onClick={translateSourceText}
                    disabled={!sourceText.trim() || isLoading}
                    className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50 active:scale-95"
                  >
                    {mode === 'translate' ? <Zap className="w-6 h-6 fill-white" /> : <Check className="w-6 h-6 fill-white" />}
                    {mode === 'translate' ? 'ترجم الآن' : 'تشغيل التدقيق'}
                  </button>
                </motion.div>
              </div>
            ) : null}
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
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg">حدث خطأ</h4>
                        <p className="font-medium text-red-700/80 leading-relaxed">{error}</p>
                      </div>
                      <button
                        onClick={() => {
                          setError(null);
                          setResult("");
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-all text-xs font-bold"
                      >
                        <ChevronLeft className="w-4 h-4 ml-1" />
                        العودة للمحاولة
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-md border border-brand-border rounded-[40px] shadow-2xl shadow-brand-primary/5 overflow-hidden">
                    <div className="border-b border-brand-border/30 p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/40">
                      <h3 className="font-bold text-xl text-brand-text-heading flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                        {mode === 'translate' ? 'نتائج الترجمة' : 'نتائج التدقيق'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setResult("");
                            setSourceText("");
                            setError(null);
                          }}
                          className="flex items-center gap-2 px-6 py-3 hover:bg-brand-accent rounded-full transition-all text-sm font-bold border border-brand-border/50 text-brand-text-heading"
                        >
                          <ChevronLeft className="w-4 h-4 ml-1" />
                          رجوع
                        </button>
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
                        <div className="markdown-body font-sans text-lg leading-relaxed text-brand-text-body space-y-4" dir="auto">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result}
                          </ReactMarkdown>
                        </div>
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
                  <h4 className="font-bold text-brand-text-heading text-lg">خدمات متكاملة</h4>
                  <p className="text-sm text-brand-text-muted">ترجمة احترافية وتدقيق لغوي دقيق في مكان واحد</p>
                </div>
              </div>
              <div className="bg-white/40 p-8 rounded-[32px] border border-white/60 flex items-center gap-5 shadow-sm hover:translate-y-[-4px] transition-transform">
                <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-brand-primary font-bold text-lg">02</span>
                </div>
                <div>
                  <h4 className="font-bold text-brand-text-heading text-lg">أداء فائق</h4>
                  <p className="text-sm text-brand-text-muted">معالجة فورية وعالية الدقة للنصوص والفقرات</p>
                </div>
              </div>
              <div className="bg-white/40 p-8 rounded-[32px] border border-white/60 flex items-center gap-5 shadow-sm hover:translate-y-[-4px] transition-transform">
                <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-brand-primary font-bold text-lg">03</span>
                </div>
                <div>
                  <h4 className="font-bold text-brand-text-heading text-lg">أمان تام</h4>
                  <p className="text-sm text-brand-text-muted">تشفير وحذف تلقائي للنص بعد انتهاء العمل</p>
                </div>
              </div>
            </div>
          )}

          {/* History Section */}
          <AnimatePresence>
            {showHistory && user && history.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                className="w-full max-w-4xl mx-auto overflow-hidden"
              >
                <div className="bg-white/40 backdrop-blur-sm border border-brand-border/30 rounded-[40px] p-8 md:p-10 space-y-8 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-2xl text-brand-text-heading italic flex items-center gap-3">
                      <Zap className="w-6 h-6 text-brand-primary fill-brand-primary/10" />
                      سجل العمليات
                    </h3>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="text-sm font-bold text-brand-text-muted hover:text-brand-primary transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {history.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        onClick={() => {
                          setResult(item.content);
                          setShowHistory(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-6 bg-white/80 rounded-[32px] border border-brand-border/20 hover:border-brand-primary/40 transition-all cursor-pointer group flex items-center gap-5"
                      >
                        <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors shrink-0">
                          <Zap className="w-7 h-7 text-brand-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-brand-text-heading text-base truncate">{item.name}</p>
                          <p className="text-[11px] text-brand-text-muted font-bold uppercase tracking-wider mt-1 opacity-60">{item.date}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* How It Works Section */}
          <section id="how-it-works" className="w-full max-w-5xl mx-auto py-20 border-t border-brand-border/20">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-brand-text-heading italic mb-4">كيف يعمل فلاش؟</h3>
              <p className="text-brand-text-muted">ثلاث خطوات بسيطة تفصلك عن نتائج احترافية</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Decorative Arrows for Desktop */}
              <div className="hidden md:block absolute top-1/2 left-1/3 w-1/4 h-px bg-dashed bg-brand-primary/20 -translate-y-1/2"></div>
              <div className="hidden md:block absolute top-1/2 right-1/3 w-1/4 h-px bg-dashed bg-brand-primary/20 -translate-y-1/2"></div>

              <div className="flex flex-col items-center text-center space-y-6 relative z-1">
                <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
                  <Zap className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xl text-brand-text-heading">1. ادخل نصك</h4>
                  <p className="text-brand-text-muted text-sm leading-relaxed">قم بكتابة أو لصق النص الذي ترغب في ترجمته أو تدقيقه في المربع المخصص.</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-6 relative z-1">
                <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center shadow-lg transform -rotate-2">
                  <ArrowRightLeft className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xl text-brand-text-heading">2. اختر الخدمة</h4>
                  <p className="text-brand-text-muted text-sm leading-relaxed">حدد ما إذا كنت ترغب في الترجمة بين اللغات أو التدقيق اللغوي للنص.</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-6 relative z-1">
                <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center shadow-lg transform rotate-6">
                  <Copy className="w-10 h-10 text-brand-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xl text-brand-text-heading">3. استلم النتيجة</h4>
                  <p className="text-brand-text-muted text-sm leading-relaxed">بضغطة زر واحدة ستحصل على نتيجة احترافية فورية لنصك.</p>
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
