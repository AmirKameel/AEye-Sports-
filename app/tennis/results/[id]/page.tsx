'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { VideoAnalysis } from '@/lib/supabase';
import TennisAnalysisReport from '@/components/TennisAnalysisReport';
import TennisAnalysisReportAccurate from '@/components/TennisAnalysisReportAccurate';
import { TennisAnalysisResult } from '@/lib/tennis-tracker';

interface PlayerStats {
  id: number;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  heatmap: number[][];
  courtCoverage: number;
}

interface AccurateAnalysisResult {
  frames: Array<{
    timestamp: number;
    players: Array<{
      id: number;
      position: { x: number; y: number };
      speed: number;
    }>;
    netPosition?: { x: number; y: number };
    courtScale: number;
  }>;
  players: { [key: number]: PlayerStats };
  duration: number;
  isAccurateMode?: boolean;
}

interface ExtendedAnalysisResult extends TennisAnalysisResult {
  isAccurateMode?: boolean;
}

export default function TennisResultsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  if (!id) {
    throw new Error("Invalid or missing 'id' parameter.");
  }
  
  // Get the video URL from the query parameters if available
  const videoUrlFromQuery = searchParams?.get('videoUrl') || null;
  
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [tennisAnalysis, setTennisAnalysis] = useState<ExtendedAnalysisResult | AccurateAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        // First, try to get the analysis from localStorage
        const localStorageKey = `analysis-${id}`;
        const storedAnalysis = localStorage.getItem(localStorageKey);
        
        if (storedAnalysis) {
          // If we have the analysis in localStorage, use it
          const parsedAnalysis = JSON.parse(storedAnalysis);
          
          // Create a VideoAnalysis object from the stored data
          const analysisObj: VideoAnalysis = {
            id: id!,
            user_id: 'client-user',
            video_url: videoUrlFromQuery || '',
            sport_type: 'tennis',
            analysis_status: 'completed',
            analysis_result: parsedAnalysis,
            created_at: new Date().toISOString()
          };
          
          setAnalysis(analysisObj);
          setTennisAnalysis(parsedAnalysis);
          setLoading(false);
          return;
        }
        
        // If not in localStorage, try to fetch from the API
        const response = await fetch(`/api/analysis/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch analysis');
        }
        
        // If we have a video URL from the query parameters, use it
        if (videoUrlFromQuery && data.analysis) {
          data.analysis.video_url = videoUrlFromQuery;
        }
        
        setAnalysis(data.analysis);
        
        // Check if the analysis result exists
        if (data.analysis.analysis_result) {
          setTennisAnalysis(data.analysis.analysis_result);
        }
      } catch (error: any) {
        console.error('Error fetching analysis:', error);
        setError(error.message || 'Error fetching analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [id, videoUrlFromQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Loading Analysis...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!tennisAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">No analysis data found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tennis Analysis Results</h1>
          {analysis?.video_url && (
            <video
              src={analysis.video_url}
              className="mt-4 w-full max-w-3xl mx-auto rounded shadow"
              controls
            />
          )}
        </div>

        {tennisAnalysis && 'isAccurateMode' in tennisAnalysis && tennisAnalysis.isAccurateMode ? (
          <TennisAnalysisReportAccurate result={tennisAnalysis as AccurateAnalysisResult} />
        ) : (
          <TennisAnalysisReport result={tennisAnalysis as TennisAnalysisResult} />
        )}

        <div className="mt-8 text-center">
          <Link
            href="/tennis/player-analysis"
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Player Analysis
          </Link>
        </div>
      </div>
    </div>
  );
}
