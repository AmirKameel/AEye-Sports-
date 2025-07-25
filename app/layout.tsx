import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../lib/i18n/LanguageContext";
import { AuthProvider } from "../lib/auth/AuthContext";
import ClientLayout from "../components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AEye Sport",
  description: "AI-powered analysis for football and tennis videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
