'use client';

import { useState } from 'react';

interface PrivateSession {
  id: string;
  date: string;
  duration_minutes: number;
  session_notes: string;
  identified_weaknesses: string[];
  achieved_improvements: string[];
  improvement_percentage: number;
  next_session_focus: string[];
  overall_rating: number;
  coach: {
    first_name: string;
    last_name: string;
  };
}

interface PrivateSessionsCalendarProps {
  sessions: PrivateSession[];
}

export default function PrivateSessionsCalendar({ sessions }: PrivateSessionsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<PrivateSession | null>(null);

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
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter sessions for current month
  const currentMonthSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate.getMonth() === currentDate.getMonth() && 
           sessionDate.getFullYear() === currentDate.getFullYear();
  });

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

    days.push(
      <div
        key={day}
        onClick={() => handleDateClick(date)}
        className={`h-12 flex items-center justify-center text-sm font-medium rounded-md cursor-pointer transition-colors ${
          session
            ? 'bg-purple-500 text-white hover:bg-purple-600'
            : isToday
            ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`}
        title={session ? `Private session with ${session.coach.first_name} ${session.coach.last_name}` : ''}
      >
        <span>{day}</span>
        {session && (
          <span className="ml-1 text-xs">🎾</span>
        )}
      </div>
    );
  }

  // Calculate progress over time for chart
  const progressData = currentMonthSessions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((session, index) => ({
      session: index + 1,
      rating: session.overall_rating,
      improvement: session.improvement_percentage
    }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Private Sessions</h3>
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
            <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
            <span>Private Session</span>
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

      {/* Monthly Summary */}
      {currentMonthSessions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Summary</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentMonthSessions.length}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(currentMonthSessions.reduce((sum, session) => sum + session.overall_rating, 0) / currentMonthSessions.length).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {(currentMonthSessions.reduce((sum, session) => sum + session.improvement_percentage, 0) / currentMonthSessions.length).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Average Improvement</div>
            </div>
          </div>

          {/* Progress Chart */}
          {progressData.length > 1 && (
            <div className="mb-6">
              <h5 className="font-semibold text-gray-900 mb-2">Performance Over Time</h5>
              <div className="h-32 flex items-end space-x-2">
                {progressData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(data.rating / 10) * 100}%` }}
                      title={`Session ${data.session}: ${data.rating}/10`}
                    ></div>
                    <div className="text-xs text-gray-600 mt-1">S{data.session}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weakness Analysis */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-2">Most Common Areas of Focus</h5>
            <div className="space-y-2">
              {(() => {
                const weaknessCount: {[key: string]: number} = {};
                currentMonthSessions.forEach(session => {
                  session.identified_weaknesses.forEach(weakness => {
                    weaknessCount[weakness] = (weaknessCount[weakness] || 0) + 1;
                  });
                });
                
                return Object.entries(weaknessCount)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([weakness, count]) => (
                    <div key={weakness} className="flex justify-between items-center">
                      <span className="text-gray-700">{weakness}</span>
                      <span className="bg-gray-200 px-2 py-1 rounded text-sm">{count} sessions</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Private Session - {new Date(selectedSession.date).toLocaleDateString()}
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
                  <span className="font-medium">Coach:</span> {selectedSession.coach.first_name} {selectedSession.coach.last_name}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {selectedSession.duration_minutes} minutes
                </div>
                <div>
                  <span className="font-medium">Overall Rating:</span>
                  <div className="flex items-center mt-1">
                    <div className="flex">
                      {[...Array(10)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-lg ${
                            i < selectedSession.overall_rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="ml-2 font-medium">{selectedSession.overall_rating}/10</span>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Coach's Notes:</span>
                  <p className="mt-1 text-gray-700">{selectedSession.session_notes}</p>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-gray-900 mb-2">Performance Analysis</h5>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">Identified Weaknesses:</span>
                  <ul className="mt-1 list-disc list-inside text-gray-700">
                    {selectedSession.identified_weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <span className="font-medium">Achieved Improvements:</span>
                  <ul className="mt-1 list-disc list-inside text-gray-700">
                    {selectedSession.achieved_improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <span className="font-medium">Improvement Percentage:</span>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${selectedSession.improvement_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 mt-1">{selectedSession.improvement_percentage}%</span>
                  </div>
                </div>
                
                <div>
                  <span className="font-medium">Focus for Next Session:</span>
                  <ul className="mt-1 list-disc list-inside text-gray-700">
                    {selectedSession.next_session_focus.map((focus, index) => (
                      <li key={index}>{focus}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}