/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Clock, ChevronLeft } from 'lucide-react';

export interface HistoryItem {
  name: string;
  date: string;
  content: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClose: () => void;
}

export function HistoryPanel({ isOpen, history, onSelect, onClose }: HistoryPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-[#1a1a1a] shadow-2xl z-[100] flex flex-col border-l border-gray-100 dark:border-gray-800"
        >
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xl font-bold italic text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#FF5722] fill-[#FF5722]/10" />
              سجل العمليات
            </h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              id="history-close-btn"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Clock className="w-12 h-12 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">لا يوجد سجل مسبق</p>
              </div>
            ) : (
              history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(item)}
                  className="w-full p-5 bg-gray-50 dark:bg-gray-800/50 hover:bg-[#FF5722]/5 dark:hover:bg-[#FF5722]/10 border border-transparent hover:border-[#FF5722]/20 rounded-2xl transition-all text-right group"
                  id={`history-item-${i}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#FF5722] uppercase tracking-widest">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{item.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <p className="text-[10px] text-gray-400 text-center font-medium leading-relaxed">
              * يتم حفظ السجل محلياً على متصفحك لضمان الخصوصية. <br/> يتم عرض آخر 5 عمليات فقط.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
