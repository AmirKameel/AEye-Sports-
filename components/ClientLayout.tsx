'use client';

import { useAuth } from "../lib/auth/AuthContext";
import { useLanguage } from "../lib/i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import Link from "next/link";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold hover:text-blue-200">
              AEye Sport
            </Link>
            <p className="text-blue-100">{t('header.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            {!loading && (
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-blue-100">
                      Welcome, {user.email}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/auth/signin"
                      className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} AEye Sport. All rights reserved.</p>
          <p className="text-gray-400 text-sm mt-2">
            AEye Team
          </p>
        </div>
      </footer>
    </div>
  );
} 