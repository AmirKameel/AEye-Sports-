'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import PlayerProfile from '@/components/player/PlayerProfile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlayerProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || userProfile?.role !== 'player') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-600">Access Denied</h2>
        <p className="text-gray-500">You need to be logged in as a player to view this page.</p>
      </div>
    );
  }

  return <PlayerProfile />;
}