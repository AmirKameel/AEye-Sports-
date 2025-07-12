'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface SportCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const sports: SportCard[] = [
  {
    title: "football.title",
    description: "football.description",
    icon: "⚽",
    path: "/football",
    color: "bg-blue-500"
  },
  {
    title: "tennis.title",
    description: "tennis.description",
    icon: "🎾",
    path: "/tennis",
    color: "bg-green-500"
  }
];

export default function Home() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to sign in if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      // Don't redirect from home page, let middleware handle it for other routes
      // This is just to show the home page with sign-in prompt
    }
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-100">
      <h1 className="text-4xl font-bold mb-2 text-center">{t('home.title')}</h1>
      <p className="text-lg text-gray-600 mb-12 text-center">
        {t('home.subtitle')}
      </p>
      
      {!loading && !user ? (
        <div className="mb-12 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-3">Sign In Required</h2>
          <p className="mb-4">Please sign in or create an account to access all features.</p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/auth/signin" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/signup" 
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : null}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {sports.map((sport, index) => (
          <Link 
            href={sport.path} 
            key={index}
            className="group transition-all duration-300 hover:scale-105"
          >
            <div className={`${sport.color} rounded-lg shadow-lg overflow-hidden h-full`}>
              <div className="p-8 text-white flex flex-col h-full">
                <div className="text-5xl mb-4">{sport.icon}</div>
                <h2 className="text-2xl font-bold mb-3">{t(`home.${sport.title}`)}</h2>
                <p className="text-white/80 flex-grow">{t(`home.${sport.description}`)}</p>
                <div className="mt-6 flex justify-end">
                  <span className="text-white group-hover:translate-x-2 transition-transform duration-300">
                    {t('common.getStarted')} →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
