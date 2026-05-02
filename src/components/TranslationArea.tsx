/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Zap, Check, Mic, Upload, Music, Trash2, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceMode } from '../constants';
import { cn } from '../lib/utils';

interface TranslationAreaProps {
  mode: ServiceMode;
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  audioFile: File | null;
  onRemoveAudio: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function TranslationArea({ 
  mode, 
  sourceText, 
  onSourceTextChange, 
  onFileChange, 
  audioFile, 
  onRemoveAudio, 
  onSubmit, 
  isLoading 
}: TranslationAreaProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 dark:bg-black/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-[40px] p-8 md:p-12 space-y-8 shadow-lg"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5722]/10 flex items-center justify-center">
            {mode === 'translate' ? <Zap className="w-6 h-6 text-[#FF5722]" /> : 
             mode === 'proofread' ? <Check className="w-6 h-6 text-[#FF5722]" /> :
             <Mic className="w-6 h-6 text-[#FF5722]" />}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-900 dark:text-white text-xl leading-snug">
              {mode === 'translate' ? 'ترجمة النص المباشر' : 
               mode === 'proofread' ? 'التدقيق اللغوي الذكي' : 
               'التفريغ الصوتي الذكي'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {mode === 'translate' ? 'اكتب أو الصق ما تريد ترجمته بالأسفل' : 
               mode === 'proofread' ? 'اكتب أو الصق النص الذي ترغب في تدقيقه' :
               'قم برفع ملف صوتي للحصول على تفريغ منسق'}
            </p>
          </div>
        </div>
        
        {mode === 'transcribe' && (
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              id="audio-upload"
              accept="audio/*"
              className="hidden"
              onChange={onFileChange}
            />
            <label 
              htmlFor="audio-upload"
              className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-[#FF5722] hover:bg-[#FF5722] hover:text-white transition-all font-bold text-sm shadow-sm cursor-pointer border border-[#FF5722]/20"
            >
              <Upload className="w-5 h-5" />
              رفع ملف صوتي
            </label>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mode === 'transcribe' && audioFile && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-6 bg-[#FF5722]/5 dark:bg-[#FF5722]/10 border border-[#FF5722]/20 rounded-3xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FF5722] rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{audioFile.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              onClick={onRemoveAudio}
              className="p-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-xl transition-colors"
              id="audio-remove-btn"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        value={sourceText}
        onChange={(e) => onSourceTextChange(e.target.value)}
        placeholder={
          mode === 'translate' ? "ادخل النص هنا..." : 
          mode === 'proofread' ? "ادخل نصك هنا للمراجعة اللغوية..." :
          "النص سيظهر هنا تلقائياً عند التحدث أو سيتم استخراجه من الملف..."
        }
        className="w-full min-h-[300px] bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus:ring-2 focus:ring-[#FF5722]/20 focus:border-[#FF5722] text-right leading-relaxed transition-all"
        dir="auto"
      />

      <button
        onClick={onSubmit}
        disabled={(!sourceText.trim() && !audioFile) || isLoading}
        className="w-full bg-[#FF5722] text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#E64A19] transition-all shadow-xl shadow-[#FF5722]/20 disabled:opacity-50 active:scale-95"
        id="translate-btn"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        ) : (
          <>
            <Wand2 className="w-6 h-6" />
            {mode === 'translate' ? 'ترجم الآن' : mode === 'proofread' ? 'تشغيل التدقيق' : 'تحسين وتنسيق النص'}
          </>
        )}
      </button>
    </motion.div>
  );
}
