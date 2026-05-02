/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Download, AlertCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ResultsAreaProps {
  result: string;
  error: React.ReactNode | null;
  onClear: () => void;
  onDownload: () => void;
}

export function ResultsArea({ result, error, onClear, onDownload }: ResultsAreaProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result && !error) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto space-y-8"
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 backdrop-blur-sm border border-red-100 dark:border-red-900/30 rounded-[24px] p-8 flex items-start gap-5 text-red-800 dark:text-red-400 shadow-sm">
          <AlertCircle className="w-8 h-8 shrink-0 text-red-400" />
          <div className="flex-1 space-y-4">
            <div className="space-y-1 text-right">
              <h4 className="font-bold text-lg">حدث خطأ</h4>
              <p className="font-medium opacity-80 leading-relaxed">{error}</p>
            </div>
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-6 py-2 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-full transition-all text-xs font-bold"
              id="clear-error-btn"
            >
              حسناً، سأحاول مرة أخرى
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-[#FF5722] rounded-[48px] p-1 shadow-2xl shadow-[#FF5722]/30 relative group">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[44px] p-8 md:p-12 space-y-10 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-6 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all shadow-sm group/btn relative overflow-hidden"
                  id="copy-btn"
                >
                  {copied ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-green-600 font-bold text-sm">
                      <Check className="w-4 h-4" /> تم النسخ
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold text-sm">
                      <Copy className="w-4 h-4 text-[#FF5722]" /> نسخ المحتوى
                    </div>
                  )}
                </button>
                <button
                  onClick={onDownload}
                  className="flex items-center gap-2 px-5 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors shadow-sm"
                  id="download-btn"
                >
                  <Download className="w-4 h-4 text-[#FF5722]" />
                </button>
              </div>
              <button 
                onClick={onClear}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="إغلاق"
                id="close-result-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 w-full text-right prose dark:prose-invert max-w-none prose-sm md:prose-base selection:bg-[#FF5722]/20">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
