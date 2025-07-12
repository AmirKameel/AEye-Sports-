'use client';

import { useAuth } from "../lib/auth/AuthContext";
import { useLanguage } from "../lib/i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  
  // Check if current path is a public route
  const isPublicRoute = ['/', '/auth/signin', '/auth/signup'].includes(pathname);

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
        {!loading && !user && !isPublicRoute ? (
          <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Authentication Required</h2>
            <p className="mb-6 text-gray-600 text-center">
              You need to sign in to access this feature.
            </p>
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
        ) : (
        {children}
        )}
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