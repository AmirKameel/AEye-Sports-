'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../lib/auth/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">AEye Sport</h1>
          <p className="text-xl md:text-2xl text-blue-200 mb-8">
            Advanced AI-powered analysis for football and tennis
          </p>
          <div className="flex justify-center gap-4">
            {user ? (
              <Link 
                href="/dashboard" 
                className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/auth/signup" 
                  className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Sign Up
                </Link>
                <Link 
                  href="/auth/signin" 
                  className="bg-transparent border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white text-gray-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Powerful Analysis Features</h2>
          
          {/* Football Features */}
          <div className="mb-20">
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 text-blue-700">
              <span className="inline-block mr-3">⚽</span> 
              Football Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard 
                title="Formation Analyzer"
                description="Design tactical formations, create scenarios and analyze team setups"
                icon="🎮"
                color="bg-blue-500"
              />
              <FeatureCard 
                title="Video Analysis"
                description="Upload videos and get AI-powered analysis of player and team performance"
                icon="🎥"
                color="bg-green-500"
              />
              <FeatureCard 
                title="Performance Metrics"
                description="Track and visualize player statistics and performance metrics"
                icon="📊"
                color="bg-purple-500"
              />
              <FeatureCard 
                title="Player Profile Maker"
                description="Create and generate custom player profiles with detailed statistics"
                icon="📝"
                color="bg-orange-500"
              />
            </div>
          </div>
          
          {/* Tennis Features */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 text-blue-700">
              <span className="inline-block mr-3">🎾</span> 
              Tennis Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <FeatureCard 
                title="Video Analysis"
                description="Upload tennis videos and get AI-powered analysis of player technique, tactics, and performance"
                icon="🎥"
                color="bg-green-500"
              />
              <FeatureCard 
                title="Player Analysis"
                description="Analyze player movement, shots, and performance metrics with automatic ball and player tracking"
                icon="🎾"
                color="bg-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-blue-800 p-8 rounded-lg text-center">
              <div className="text-4xl mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Upload Your Video</h3>
              <p className="text-blue-200">Upload your football or tennis video for analysis</p>
            </div>
            <div className="bg-blue-800 p-8 rounded-lg text-center">
              <div className="text-4xl mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-blue-200">Our advanced AI analyzes player movements, techniques, and tactics</p>
            </div>
            <div className="bg-blue-800 p-8 rounded-lg text-center">
              <div className="text-4xl mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Get Insights</h3>
              <p className="text-blue-200">Receive detailed analysis and actionable recommendations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-blue-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What Coaches Say</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <TestimonialCard 
              quote="AEye Sport has transformed how I analyze player performance. The insights are incredibly detailed and actionable."
              name="Coach Thomas"
              role="Football Academy Director"
            />
            <TestimonialCard 
              quote="The tennis analysis tools have helped my players visualize their movement patterns and improve their court coverage."
              name="Sarah Williams"
              role="Tennis Coach"
            />
            <TestimonialCard 
              quote="Being able to analyze formations and tactical setups has given my team a competitive edge in preparation."
              name="Michael Chen"
              role="Football Analyst"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to elevate your analysis?</h2>
          <p className="text-xl text-blue-200 mb-8 max-w-3xl mx-auto">
            Join coaches and analysts who are using AEye Sport to gain deeper insights and improve performance.
          </p>
          {user ? (
            <Link 
              href="/dashboard" 
              className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link 
              href="/auth/signup" 
              className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Get Started Now
            </Link>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} AEye Sport. All rights reserved.</p>
          <p className="text-blue-300 text-sm mt-2">
            Advanced AI-powered sports analysis platform
          </p>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ title, description, icon, color }: { 
  title: string; 
  description: string; 
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
      <div className={`${color} p-6 text-white`}>
        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <div className="p-6">
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

// Testimonial Card Component
function TestimonialCard({ quote, name, role }: { 
  quote: string; 
  name: string; 
  role: string;
}) {
  return (
    <div className="bg-blue-700 p-6 rounded-lg">
      <p className="text-blue-100 mb-4 italic">"{quote}"</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-blue-300 text-sm">{role}</p>
      </div>
    </div>
  );
}