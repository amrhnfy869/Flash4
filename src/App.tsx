/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'motion/react';

// Hooks & Services
import { AuthProvider, useAuth } from './hooks/useAuth';
import { translateWithAI } from './services/aiService';
import { LANGUAGES, ServiceMode } from './constants';

// Components
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { PrivacyModal } from './components/PrivacyModal';
import { ServiceToggle } from './components/ServiceToggle';
import { LanguageSelector } from './components/LanguageSelector';
import { TranslationArea } from './components/TranslationArea';
import { ResultsArea } from './components/ResultsArea';
import { HistoryPanel, HistoryItem } from './components/HistoryPanel';

function AppContent() {
  const { user } = useAuth();
  
  // UI State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = window.localStorage.getItem('faseeh_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // App Logic State
  const [mode, setMode] = useState<ServiceMode>('translate');
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ar');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Effects
  useEffect(() => {
    try {
      const savedHistory = window.localStorage.getItem('faseeh_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Error parsing history:", e);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('faseeh_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('faseeh_theme', 'light');
    }
  }, [isDarkMode]);

  // Handlers
  const addToHistory = (name: string, content: string) => {
    const newItem = {
      name,
      content,
      date: new Date().toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    window.localStorage.setItem('faseeh_history', JSON.stringify(newHistory));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('يرجى اختيار ملف صوتي صالح.');
      return;
    }
    setAudioFile(file);
    setIsLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAudioBase64(base64);
        handleSubmit(base64, file.type);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('فشل في قراءة ملف الصوت.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (directBase64?: string, mimeType?: string) => {
    const activeBase64 = directBase64 || audioBase64;
    if (!sourceText.trim() && !activeBase64) return;

    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      let promptText = "";
      let parts: any[] = [];

      if (mode === 'translate') {
        const src = LANGUAGES.find(l => l.code === sourceLang)?.name;
        const tgt = LANGUAGES.find(l => l.code === targetLang)?.name;
        promptText = `Translate from ${sourceLang === 'auto' ? 'detected language' : src} to ${tgt}. Professional tone. Return ONLY translation.\n\n${sourceText}`;
        parts.push({ text: promptText });
      } else if (mode === 'proofread') {
        promptText = `Proofread this text. Correct grammar and style. Return ONLY corrected text.\n\n${sourceText}`;
        parts.push({ text: promptText });
      } else if (mode === 'transcribe') {
        if (activeBase64) {
          promptText = `Transcribe and summarize this audio accurately. Return result in Arabic. Return ONLY the text.`;
          parts.push({ text: promptText });
          parts.push({ inlineData: { data: activeBase64, mimeType: mimeType || audioFile?.type || 'audio/mpeg' } });
        } else {
          promptText = `Refine this transcription. Fix errors, improve flow. Return ONLY refined text.\n\n${sourceText}`;
          parts.push({ text: promptText });
        }
      }

      const response = await translateWithAI("gemini-3-flash-preview", { parts });
      const output = response.text;
      
      if (!output) throw new Error("لم يتم الحصول على نتيجة من الخادم.");
      setResult(output);
      addToHistory(mode === 'translate' ? "ترجمة" : mode === 'proofread' ? "تدقيق" : "تفريغ", output);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  };

  const swapLanguages = () => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const fileData = new Blob([result], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileData);
    element.download = `faseeh_${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans selection:bg-[#FF5722]/10 relative transition-colors duration-300" dir="rtl">
      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-white/95 dark:bg-black/95 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[40px] shadow-2xl p-10 text-center space-y-8 border border-gray-200 dark:border-gray-800"
          >
            <div className="w-20 h-20 bg-[#FF5722]/10 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Zap className="w-10 h-10 text-[#FF5722] animate-pulse" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold italic leading-relaxed">بسم الله الرحمن الرحيم</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">مرحباً بك في فلاش - منصتك الذكية للترجمة والتفريغ</p>
            </div>
            <button 
              onClick={() => setShowWelcome(false)}
              className="w-full bg-[#FF5722] text-white py-5 rounded-2xl font-bold text-xl hover:bg-[#E64A19] shadow-lg shadow-[#FF5722]/20 transition-all active:scale-95"
              id="start-btn"
            >
              ابدأ الآن
            </button>
          </motion.div>
        </div>
      )}

      {/* Main UI */}
      <Header 
        onShowAuth={() => setShowAuthModal(true)} 
        onToggleHistory={() => setShowHistory(!showHistory)}
        isHistoryOpen={showHistory}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <HistoryPanel 
        isOpen={showHistory} 
        history={history} 
        onClose={() => setShowHistory(false)}
        onSelect={(item) => {
          setResult(item.content);
          setShowHistory(false);
        }}
      />

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
        {/* Hero */}
        <section className="text-center space-y-12">
          <div className="flex flex-col items-center gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-6 py-2 bg-[#FF5722]/10 rounded-full border border-[#FF5722]/20 shadow-sm"
            >
              <Zap className="w-4 h-4 text-[#FF5722]" />
              <span className="text-[10px] font-bold text-[#FF5722] tracking-widest uppercase italic">فلاش - خدمات لغوية فائقة</span>
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tight leading-tight">
              {mode === 'translate' ? 'ترجمة احترافية ذكية' : mode === 'proofread' ? 'تدقيق لغوي فائق' : 'تفريغ صوتي ذكي'} <br/>
              <span className="text-[#FF5722]">في غمضة عين</span>
            </h2>
          </div>

          <ServiceToggle mode={mode} onModeChange={(m) => {
            setMode(m);
            setResult('');
            setError(null);
          }} />
        </section>

        <LanguageSelector 
          isVisible={mode === 'translate'}
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceLangChange={setSourceLang}
          onTargetLangChange={setTargetLang}
          onSwap={swapLanguages}
        />

        <TranslationArea 
          mode={mode}
          sourceText={sourceText}
          onSourceTextChange={setSourceText}
          onFileChange={handleFileChange}
          audioFile={audioFile}
          onRemoveAudio={() => {
            setAudioFile(null);
            setAudioBase64(null);
          }}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />

        <ResultsArea 
          result={result}
          error={error}
          onClear={() => {
            setResult('');
            setError(null);
          }}
          onDownload={handleDownload}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-100 dark:border-gray-800 text-center space-y-4">
        <div className="flex justify-center gap-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <button onClick={() => setShowPrivacyModal(true)} className="hover:text-[#FF5722] transition-colors">سياسة الخصوصية</button>
          <a href="#" className="hover:text-[#FF5722] transition-colors">الشروط والأحكام</a>
        </div>
        <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium tracking-tight">
          &copy; {new Date().getFullYear()} فلاش. جميع الحقوق محفوظة. مدعوم بتقنيات الذكاء الاصطناعي العالمية.
        </p>
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
