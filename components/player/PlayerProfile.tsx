'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getPlayerProfile, getPlayerAttendance, getPlayerPrivateSessions, getEligibleTournaments } from '@/lib/supabase-config';
import AttendanceCalendar from './AttendanceCalendar';
import GroupPlanCalendar from './GroupPlanCalendar';
import PrivateSessionsCalendar from './PrivateSessionsCalendar';

interface PlayerProfileProps {
  playerId?: string; // Optional for when viewing other players
}

export default function PlayerProfile({ playerId }: PlayerProfileProps) {
  const { user, userProfile } = useAuth();
  const [player, setPlayer] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [privateSessions, setPrivateSessions] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'group' | 'plan' | 'private'>('info');

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        // Determine which player to fetch
        let targetPlayerId = playerId;
        
        if (!targetPlayerId && userProfile?.role === 'player') {
          // If no playerId provided and user is a player, fetch their own profile
          const { data: playerData } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user?.id)
            .single();
          
          targetPlayerId = playerData?.id;
        }

        if (!targetPlayerId) {
          setLoading(false);
          return;
        }

        // Fetch player profile
        const { data: playerData, error: playerError } = await getPlayerProfile(targetPlayerId);
        if (playerError) {
          console.error('Error fetching player:', playerError);
          setLoading(false);
          return;
        }

        setPlayer(playerData);

        // Fetch attendance data
        const { data: attendanceData } = await getPlayerAttendance(targetPlayerId);
        setAttendance(attendanceData || []);

        // Fetch private sessions
        const { data: sessionsData } = await getPlayerPrivateSessions(targetPlayerId);
        setPrivateSessions(sessionsData || []);

        // Fetch eligible tournaments
        if (playerData?.date_of_birth) {
          const { data: tournamentsData } = await getEligibleTournaments(playerData.date_of_birth);
          setTournaments(tournamentsData || []);
        }

      } catch (error) {
        console.error('Error fetching player data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId, user, userProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-600">Player not found</h2>
      </div>
    );
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const calculateAttendancePercentage = (period: 'month' | '3months' | '6months' | 'year') => {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const periodAttendance = attendance.filter(record => 
      new Date(record.date) >= startDate
    );

    const totalSessions = periodAttendance.length;
    const presentSessions = periodAttendance.filter(record => 
      record.status === 'present'
    ).length;

    return totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {player.first_name} {player.last_name}
            </h1>
            <p className="text-gray-600">Player ID: {player.serial_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Age: {calculateAge(player.date_of_birth)}</p>
            <p className="text-sm text-gray-500">
              Academy: {player.academy?.name || 'Independent Player'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'info', label: 'Basic Info', icon: '👤' },
              { id: 'group', label: 'Group Academy Info', icon: '👥' },
              { id: 'plan', label: 'Academy Group Plan', icon: '📅' },
              { id: 'private', label: 'Private Sessions', icon: '🎾' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Basic Info Tab */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{player.first_name} {player.last_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <p className="mt-1 text-sm text-gray-900">{calculateAge(player.date_of_birth)} years</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(player.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                    <p className="mt-1 text-sm text-gray-900">{player.serial_number}</p>
                  </div>
                </div>

                <h4 className="text-md font-semibold text-gray-900 mt-6">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Personal Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{player.personal_phone || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <p className="mt-1 text-sm text-gray-900">{player.whatsapp_number || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Father's Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{player.father_phone || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mother's Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{player.mother_phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Technical Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dominant Hand</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{player.dominant_hand}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dominant Eye</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{player.dominant_eye}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Backhand Type</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {player.backhand_type === 'one_handed' ? 'One-Handed' : 'Two-Handed'}
                    </p>
                  </div>
                </div>

                <h4 className="text-md font-semibold text-gray-900 mt-6">Eligible Tournaments</h4>
                <div className="space-y-2">
                  {tournaments.length > 0 ? (
                    tournaments.map((tournament) => (
                      <div key={tournament.id} className="bg-blue-50 p-3 rounded-md">
                        <p className="font-medium text-blue-900">{tournament.name}</p>
                        <p className="text-sm text-blue-700">{tournament.age_category}</p>
                        <p className="text-xs text-blue-600">
                          Registration deadline: {new Date(tournament.registration_deadline).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No eligible tournaments found</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Group Academy Info Tab */}
          {activeTab === 'group' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Training Schedule</h4>
                  {player.training_groups?.length > 0 ? (
                    player.training_groups.map((group: any) => (
                      <div key={group.group.id} className="mb-2">
                        <p className="font-medium">{group.group.name}</p>
                        {group.group.schedule?.map((schedule: any, index: number) => (
                          <p key={index} className="text-sm text-gray-600">
                            {schedule.day}: {schedule.start_time} - {schedule.end_time} ({schedule.type})
                          </p>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No training groups assigned</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Payment Status</h4>
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    player.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : player.payment_status === 'overdue'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {player.payment_status.charAt(0).toUpperCase() + player.payment_status.slice(1)}
                  </div>
                  {player.payment_due_date && (
                    <p className="text-sm text-gray-600 mt-2">
                      Due: {new Date(player.payment_due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Attendance Rate</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Last Month:</span>
                      <span className="font-medium">{calculateAttendancePercentage('month')}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last 3 Months:</span>
                      <span className="font-medium">{calculateAttendancePercentage('3months')}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last 6 Months:</span>
                      <span className="font-medium">{calculateAttendancePercentage('6months')}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Year:</span>
                      <span className="font-medium">{calculateAttendancePercentage('year')}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <AttendanceCalendar attendance={attendance} />
            </div>
          )}

          {/* Academy Group Plan Tab */}
          {activeTab === 'plan' && (
            <GroupPlanCalendar playerId={player.id} />
          )}

          {/* Private Sessions Tab */}
          {activeTab === 'private' && (
            <PrivateSessionsCalendar sessions={privateSessions} />
          )}
        </div>
      </div>
    </div>
  );
}