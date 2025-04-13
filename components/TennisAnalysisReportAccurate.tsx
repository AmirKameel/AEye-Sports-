/// <reference types="react" />

'use client';

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PlayerPosition {
  x: number;
  y: number;
}

interface Player {
  id: number;
  position: PlayerPosition;
  speed: number;
}

interface Frame {
  timestamp: number;
  players: Player[];
  netPosition?: PlayerPosition;
}

interface PlayerStats {
  id: number;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  heatmap: number[][];
  courtCoverage: number;
}

interface AccurateAnalysisResult {
  frames: Frame[];
  players: { [key: number]: PlayerStats };
  duration: number;
}

interface TennisAnalysisReportAccurateProps {
  result: AccurateAnalysisResult;
}

interface SpeedChartProps {
  frames: Frame[];
  playerId: number;
}

interface HeatMapProps {
  heatmap: number[][];
}

export default function TennisAnalysisReportAccurate({ result }: TennisAnalysisReportAccurateProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(
    Object.keys(result.players).length > 0 ? parseInt(Object.keys(result.players)[0]) : 0
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'movement'>('overview');

  // Format duration to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time to mm:ss.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(1)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Advanced Tennis Analysis Report</h2>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'players' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('players')}
        >
          Player Analysis
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'movement' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('movement')}
        >
          Movement Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Match Duration</h3>
              <p className="text-3xl font-bold">{formatDuration(result.duration)}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Players Tracked</h3>
              <p className="text-3xl font-bold">{Object.keys(result.players).length}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Frames Analyzed</h3>
              <p className="text-3xl font-bold">{result.frames.length}</p>
            </div>
          </div>

          {/* Player Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(result.players).map(([id, stats]) => (
              <div key={id} className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Player {id}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600">Total Distance</p>
                    <p className="text-2xl font-bold">{stats.totalDistance.toFixed(1)}m</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Average Speed</p>
                    <p className="text-2xl font-bold">{stats.averageSpeed.toFixed(1)} km/h</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Court Coverage</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${stats.courtCoverage}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-sm">{stats.courtCoverage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Analysis Tab */}
      {activeTab === 'players' && (
        <div>
          {/* Player Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Player</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(parseInt(e.target.value))}
              className="block w-full p-2 border rounded"
            >
              {Object.keys(result.players).map((id) => (
                <option key={id} value={id}>Player {id}</option>
              ))}
            </select>
          </div>

          {/* Selected Player Stats */}
          {result.players[selectedPlayerId] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Speed Profile</h3>
                <SpeedChart
                  frames={result.frames}
                  playerId={selectedPlayerId}
                />
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Position Heat Map</h3>
                <HeatMap
                  heatmap={result.players[selectedPlayerId].heatmap}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movement Analysis Tab */}
      {activeTab === 'movement' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Player Movement Comparison</h3>
              <div className="space-y-4">
                {Object.entries(result.players).map(([id, stats]) => (
                  <div key={id} className="border-b pb-4">
                    <p className="font-medium mb-2">Player {id}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Distance</p>
                        <p className="text-lg font-semibold">{stats.totalDistance.toFixed(1)}m</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Max Speed</p>
                        <p className="text-lg font-semibold">{stats.maxSpeed.toFixed(1)} km/h</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Court Coverage Analysis</h3>
              <div className="space-y-4">
                {Object.entries(result.players).map(([id, stats]) => (
                  <div key={id}>
                    <p className="text-sm text-gray-600 mb-1">Player {id} Coverage</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${stats.courtCoverage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stats.courtCoverage.toFixed(1)}% court coverage</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function SpeedChart({ frames, playerId }: SpeedChartProps) {
  const data = {
    labels: frames.map(frame => formatTime(frame.timestamp)),
    datasets: [{
      label: 'Speed (km/h)',
      data: frames.map(frame => {
        const player = frame.players.find(p => p.id === playerId);
        return player ? player.speed : 0;
      }),
      borderColor: 'rgb(59, 130, 246)',
      tension: 0.1
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Speed (km/h)'
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
}

function HeatMap({ heatmap }: HeatMapProps) {
  const maxValue = Math.max(...heatmap.flat());
  
  return (
    <div className="grid grid-cols-10 gap-0.5 aspect-square">
      {heatmap.flat().map((value, index) => (
        <div
          key={index}
          className="aspect-square rounded"
          style={{
            backgroundColor: `rgba(59, 130, 246, ${value / maxValue})`
          }}
        />
      ))}
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1)}`;
}
