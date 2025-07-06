'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { useAuth } from '@/components/auth/AuthProvider';

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
  const { user, userProfile } = useAuth();

  // If user is logged in, redirect to appropriate dashboard
  React.useEffect(() => {
    if (user && userProfile) {
      switch (userProfile.role) {
        case 'player':
          window.location.href = '/player/profile';
          break;
        case 'coach':
          window.location.href = '/coach/dashboard';
          break;
        case 'academy_admin':
          window.location.href = '/academy/dashboard';
          break;
        case 'parent':
          window.location.href = '/parent/dashboard';
          break;
        default:
          break;
      }
    }
  }, [user, userProfile]);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-100">
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-center">{t('home.title')}</h1>
          <p className="text-lg text-gray-600 mb-12 text-center">
            {t('home.subtitle')}
          </p>
        </div>
        
        {/* Auth Buttons */}
        <div className="flex space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {userProfile?.first_name || user.email}
              </span>
              <Link
                href="/auth/signin"
                onClick={() => {
                  // Sign out logic would go here
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Sign Out
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Sports Cards */}
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

      {/* Academy Management Section */}
      {!user && (
        <div className="mt-16 w-full max-w-4xl">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Tennis Academy Management Platform
            </h2>
            <p className="text-gray-600 mb-6">
              Comprehensive player profiling, attendance tracking, performance analysis, and academy management tools.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">👤</div>
                <h3 className="font-semibold">Player Profiles</h3>
                <p className="text-sm text-gray-600">Comprehensive player information and progress tracking</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl mb-2">📅</div>
                <h3 className="font-semibold">Attendance</h3>
                <p className="text-sm text-gray-600">Track attendance and participation rates</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">🎾</div>
                <h3 className="font-semibold">Private Sessions</h3>
                <p className="text-sm text-gray-600">Detailed session analysis and progress tracking</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl mb-2">🏆</div>
                <h3 className="font-semibold">Tournaments</h3>
                <p className="text-sm text-gray-600">Tournament eligibility and registration management</p>
              </div>
            </div>
            <Link
              href="/auth/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}