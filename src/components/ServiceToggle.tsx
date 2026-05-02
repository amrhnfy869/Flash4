/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRightLeft, Check, Mic } from 'lucide-react';
import { ServiceMode } from '../constants';
import { cn } from '../lib/utils';

interface ServiceToggleProps {
  mode: ServiceMode;
  onModeChange: (mode: ServiceMode) => void;
}

export function ServiceToggle({ mode, onModeChange }: ServiceToggleProps) {
  return (
    <div className="flex justify-center">
      <div className="bg-white/60 dark:bg-black/60 backdrop-blur-sm p-1.5 rounded-[24px] border border-gray-200 dark:border-gray-800 flex shadow-sm w-full max-w-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => onModeChange('translate')}
          className={cn(
            "flex-1 min-w-[120px] py-4 rounded-[18px] font-bold text-sm transition-all flex items-center justify-center gap-3 group whitespace-nowrap",
            mode === 'translate' 
              ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20" 
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
          )}
          id="mode-translate-btn"
        >
          <ArrowRightLeft className={cn("w-4 h-4", mode === 'translate' ? "text-white" : "text-[#FF5722]")} />
          ترجمة النصوص
        </button>
        <button
          onClick={() => onModeChange('proofread')}
          className={cn(
            "flex-1 min-w-[120px] py-4 rounded-[18px] font-bold text-sm transition-all flex items-center justify-center gap-3 group whitespace-nowrap",
            mode === 'proofread' 
              ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20" 
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
          )}
          id="mode-proofread-btn"
        >
          <Check className={cn("w-4 h-4", mode === 'proofread' ? "text-white" : "text-[#FF5722]")} />
          تدقيق لغوي
        </button>
        <button
          onClick={() => onModeChange('transcribe')}
          className={cn(
            "flex-1 min-w-[120px] py-4 rounded-[18px] font-bold text-sm transition-all flex items-center justify-center gap-3 group whitespace-nowrap",
            mode === 'transcribe' 
              ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20" 
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
          )}
          id="mode-transcribe-btn"
        >
          <Mic className={cn("w-4 h-4", mode === 'transcribe' ? "text-white" : "text-[#FF5722]")} />
          تفريغ صوتي
        </button>
      </div>
    </div>
  );
}
