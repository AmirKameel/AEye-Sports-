'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-config';

interface GroupSession {
  id: string;
  date: string;
  title: string;
  description: string;
  plan: string;
  objectives: string[];
  general_feedback?: string;
}

interface PlayerEvaluation {
  rating: number;
  notes: string;
  improvements: string[];
  areas_to_work: string[];
}

interface GroupPlanCalendarProps {
  playerId: string;
}

export default function GroupPlanCalendar({ playerId }: GroupPlanCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [evaluations, setEvaluations] = useState<{[sessionId: string]: PlayerEvaluation}>({});
  const [selectedSession, setSelectedSession] = useState<GroupSession | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PlayerEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupSessions();
  }, [currentDate, playerId]);

  const fetchGroupSessions = async () => {
    try {
      setLoading(true);
      
      // Get the first and last day of the current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Fetch group sessions for the player's groups in the current month
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('group_sessions')
        .select(`
          *,
          group:training_groups!inner(
            player_groups!inner(
              player_id
            )
          )
        `)
        .eq('group.player_groups.player_id', playerId)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        return;
      }

      setSessions(sessionsData || []);

      // Fetch player evaluations for these sessions
      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map(session => session.id);
        
        const { data: evaluationsData, error: evaluationsError } = await supabase
          .from('player_group_evaluations')
          .select('*')
          .eq('player_id', playerId)
          .in('session_id', sessionIds);

        if (evaluationsError) {
          console.error('Error fetching evaluations:', evaluationsError);
          return;
        }

        // Convert evaluations array to object keyed by session_id
        const evaluationsMap: {[sessionId: string]: PlayerEvaluation} = {};
        evaluationsData?.forEach(evaluation => {
          evaluationsMap[evaluation.session_id] = {
            rating: evaluation.rating,
            notes: evaluation.notes,
            improvements: evaluation.improvements,
            areas_to_work: evaluation.areas_to_work
          };
        });

        setEvaluations(evaluationsMap);
      }

    } catch (error) {
      console.error('Error fetching group sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getSessionForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return sessions.find(session => session.date === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    const session = getSessionForDate(date);
    if (session) {
      setSelectedSession(session);
      setSelectedEvaluation(evaluations[session.id] || null);
    }
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-12"></div>);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const session = getSessionForDate(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const hasPastSession = session && isPastDate(date);
    const hasFutureSession = session && isFutureDate(date);

    days.push(
      <div
        key={day}
        onClick={() => handleDateClick(date)}
        className={`h-12 flex items-center justify-center text-sm font-medium rounded-md cursor-pointer transition-colors ${
          session
            ? hasPastSession
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : hasFutureSession
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-500 text-white'
            : isToday
            ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`}
        title={session ? session.title : ''}
      >
        <span>{day}</span>
        {session && (
          <span className="ml-1 text-xs">
            {hasPastSession ? '📝' : hasFutureSession ? '📅' : ''}
          </span>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Group Training Plan</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              ←
            </button>
            <span className="font-medium text-gray-900 min-w-[150px] text-center">
              {monthYear}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              →
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mb-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span>Past Session (with evaluation)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>Future Session (planned)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border rounded mr-2"></div>
            <span>No Session</span>
          </div>
        </div>

        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>

      {/* Session Details */}
      {selectedSession && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Session Details - {new Date(selectedSession.date).toLocaleDateString()}
            </h4>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-gray-900 mb-2">Session Information</h5>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Title:</span> {selectedSession.title}
                </div>
                <div>
                  <span className="font-medium">Description:</span> {selectedSession.description}
                </div>
                <div>
                  <span className="font-medium">Training Plan:</span>
                  <p className="mt-1 text-gray-700">{selectedSession.plan}</p>
                </div>
                <div>
                  <span className="font-medium">Objectives:</span>
                  <ul className="mt-1 list-disc list-inside text-gray-700">
                    {selectedSession.objectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
                {selectedSession.general_feedback && (
                  <div>
                    <span className="font-medium">General Group Feedback:</span>
                    <p className="mt-1 text-gray-700">{selectedSession.general_feedback}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              {selectedEvaluation ? (
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Your Performance</h5>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Rating:</span>
                      <div className="flex items-center mt-1">
                        <div className="flex">
                          {[...Array(10)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < selectedEvaluation.rating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="ml-2 font-medium">{selectedEvaluation.rating}/10</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Coach Notes:</span>
                      <p className="mt-1 text-gray-700">{selectedEvaluation.notes}</p>
                    </div>
                    <div>
                      <span className="font-medium">Improvements Noted:</span>
                      <ul className="mt-1 list-disc list-inside text-gray-700">
                        {selectedEvaluation.improvements.map((improvement, index) => (
                          <li key={index}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium">Areas to Work On:</span>
                      <ul className="mt-1 list-disc list-inside text-gray-700">
                        {selectedEvaluation.areas_to_work.map((area, index) => (
                          <li key={index}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : isPastDate(new Date(selectedSession.date)) ? (
                <div className="text-center text-gray-500">
                  <p>No evaluation available for this session</p>
                </div>
              ) : (
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Upcoming Session</h5>
                  <p className="text-gray-700">
                    This session is scheduled for the future. The evaluation will be available after the session is completed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}