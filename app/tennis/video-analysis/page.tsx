'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../lib/i18n/LanguageContext';
import TennisVideoAnalysisGemini from '@/components/TennisVideoAnalysisGemini';

export default function TennisVideoAnalysisPage() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/tennis" className="text-blue-500 hover:underline flex items-center gap-2">
            <span>←</span> {t('common.backToTennis')}
          </Link>
        </div>
        
        <TennisVideoAnalysisGemini />
      </div>
    </div>
  );
} 