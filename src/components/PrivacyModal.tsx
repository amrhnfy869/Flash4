/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="سياسة الخصوصية" maxWidth="max-w-2xl">
      <div className="overflow-y-auto space-y-8 text-right max-h-[60vh] pr-2">
        <section className="space-y-3">
          <h4 className="font-bold text-gray-900 dark:text-white text-lg">1. معالجة البيانات</h4>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            نحن في "فلاش" نستخدم تقنيات الذكاء الاصطناعي (Gemini API) لمعالجة النصوص التي تدققها أو تترجمها. نحن لا نقوم بتخزين هذه النصوص بشكل دائم على خوادمنا؛ بل يتم تحليلها في الوقت الفعلي وحذف البيانات المؤقتة فور انتهاء العملية.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="font-bold text-gray-900 dark:text-white text-lg">2. الحساب الشخصي</h4>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            البيانات التي تدخلها (الاسم والبريد الإلكتروني) تُستخدم فقط لإنشاء جلسة عمل محلية (Local Session) على متصفحك لتحسين تجربة الاستخدام. نحن لا نشارك هذه البيانات مع أي أطراف ثالثة لأغراض تسويقية.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="font-bold text-gray-900 dark:text-white text-lg">3. أمان النصوص</h4>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            عملية انتقال النصوص من جهازك إلى خوادم المعالجة تتم عبر بروتوكولات مشفرة وآمنة تماماً. نضمن لك خصوصية محتواك وعدم اطلاع أي عنصر بشري عليه.
          </p>
        </section>

        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-[#FF5722]/10">
          <p className="text-gray-900 dark:text-white font-medium text-sm">
            باستخدامك لموقع فلاش، فإنك توافق على شروط معالجة البيانات المذكورة أعلاه لغرض المساعدة في الترجمة والمعالجة.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button 
          onClick={onClose}
          className="bg-[#FF5722] text-white px-12 py-3 rounded-2xl font-bold hover:bg-[#E64A19] transition-all w-full"
          id="privacy-close-btn"
        >
          فهمت ذلك
        </button>
      </div>
    </Modal>
  );
}
