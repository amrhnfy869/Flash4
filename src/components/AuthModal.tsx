/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      login(name, email);
      setLoading(false);
      onClose();
    }, 800);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="مرحباً بك في فلاش">
      <div className="text-center space-y-4 mb-8">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-[#FF5722] fill-[#FF5722]/10" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm px-4">أدخل بياناتك للبدء في استخراج النصوص فوراً</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-right">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white mr-1">الاسم الكامل</label>
          <input 
            required
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسمك هنا"
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 focus:border-[#FF5722] transition-all text-right dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-900 dark:text-white mr-1">البريد الإلكتروني</label>
          <input 
            required
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com"
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 focus:border-[#FF5722] transition-all text-right dark:text-white"
          />
        </div>
        
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#FF5722] text-white py-4 rounded-2xl font-bold hover:bg-[#E64A19] shadow-lg shadow-[#FF5722]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          id="auth-submit-btn"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'دخول سريع'}
        </button>
      </form>
    </Modal>
  );
}
