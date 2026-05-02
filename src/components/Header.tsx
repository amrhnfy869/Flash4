/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils'; // I'll create this utility in a second

interface HeaderProps {
  onShowAuth: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({ onShowAuth, onToggleHistory, isHistoryOpen, isDarkMode, onToggleTheme }: HeaderProps) {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md px-6 md:px-12 py-6 border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF5722] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#FF5722]/40 animate-pulse">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white italic">فلاش</h1>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-500 dark:text-gray-400 items-center">
            <a href="#" className="hover:text-[#FF5722] transition-colors">الرئيسية</a>
            {user ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={onToggleHistory}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-bold",
                    isHistoryOpen ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  )}
                  id="history-toggle-btn"
                >
                  <Zap className={cn("w-4 h-4", isHistoryOpen ? "fill-white" : "")} />
                  السجل
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#FF5722]/20 shadow-sm">
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <button 
                    onClick={logout}
                    className="hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-wider"
                    id="logout-btn"
                  >
                    خروج
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onShowAuth}
                disabled={loading}
                className="hover:text-[#FF5722] transition-colors text-gray-900 dark:text-white border-b-2 border-[#FF5722]/30 disabled:opacity-50"
                id="login-btn"
              >
                {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
              </button>
            )}
          </nav>
          <button 
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[#FF5722] hover:bg-[#FF5722] hover:text-white transition-all"
            id="theme-toggle-btn"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
