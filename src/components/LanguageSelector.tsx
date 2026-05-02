/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft } from 'lucide-react';
import { LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  sourceLang: string;
  targetLang: string;
  onSourceLangChange: (lang: string) => void;
  onTargetLangChange: (lang: string) => void;
  onSwap: () => void;
  isVisible: boolean;
}

export function LanguageSelector({ 
  sourceLang, 
  targetLang, 
  onSourceLangChange, 
  onTargetLangChange, 
  onSwap,
  isVisible
}: LanguageSelectorProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.section 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full max-w-4xl mx-auto"
        >
          <div className="flex flex-wrap items-center justify-center gap-6 w-full">
            <div className="flex-1 min-w-[160px] max-w-[200px]">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-right tracking-widest leading-none">من لغة</p>
              <select 
                value={sourceLang}
                onChange={(e) => onSourceLangChange(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#FF5722]/20 appearance-none text-right cursor-pointer shadow-sm"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            <button 
              onClick={onSwap}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-6 md:mt-2 hover:bg-[#FF5722]/10 transition-colors cursor-pointer group active:scale-95"
              id="swap-lang-btn"
            >
              <ArrowRightLeft className="w-5 h-5 text-[#FF5722] group-hover:scale-110 transition-transform" />
            </button>

            <div className="flex-1 min-w-[160px] max-w-[200px]">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-right tracking-widest leading-none">إلى لغة</p>
              <select 
                value={targetLang}
                onChange={(e) => onTargetLangChange(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#FF5722]/20 appearance-none text-right cursor-pointer shadow-sm"
              >
                {LANGUAGES.filter(l => l.code !== 'auto').map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
