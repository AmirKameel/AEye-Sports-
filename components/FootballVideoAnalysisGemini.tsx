'use client';

import React, { useState, useRef } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { 
  analyzeFootballVideoWithGemini, 
  analyzeFootballVideoWithFileAPI, 
  shouldUseFootballFileAPI,
  estimateFootballVideoDuration,
  FootballVideoAnalysisRequest,
  FootballVideoAnalysisResponse 
} from '@/lib/gemini-football-video';
import ReactMarkdown from 'react-markdown';

interface AnalysisType {
  id: 'tactical' | 'performance' | 'technical' | 'custom';
  name: string;
  description: string;
  icon: string;
}

const FOOTBALL_ANALYSIS_TYPES: AnalysisType[] = [
  {
    id: 'tactical',
    name: 'Tactical Analysis',
    description: 'Focus on formations, team strategies, and tactical patterns',
    icon: '🧠'
  },
  {
    id: 'performance',
    name: 'Performance Analysis',
    description: 'Analyze individual and team performance metrics',
    icon: '📊'
  },
  {
    id: 'technical',
    name: 'Technical Analysis',
    description: 'Focus on individual skills, technique, and execution',
    icon: '⚽'
  },
  {
    id: 'custom',
    name: 'Custom Analysis',
    description: 'Comprehensive analysis based on your specific requirements',
    icon: '⚙️'
  }
];

const markdownComponents = {
  h1: (props: any) => <h1 className="text-2xl font-bold text-blue-600 mb-4" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-semibold text-blue-600 mb-3" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-medium text-blue-600 mb-2" {...props} />,
  p: (props: any) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-3 text-gray-700" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-3 text-gray-700" {...props} />,
  li: (props: any) => <li className="mb-1" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-gray-900" {...props} />,
  code: (props: any) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />,
};

export default function FootballVideoAnalysisGemini() {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [analysisType, setAnalysisType] = useState<'tactical' | 'performance' | 'technical' | 'custom'>('tactical');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<FootballVideoAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysisResult(null);

    try {
      // Validate file size (5 minutes max)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        setError('Video file is too large. Please use a video under 500MB (approximately 5 minutes).');
        return;
      }

      // Check video duration
      const duration = await estimateFootballVideoDuration(file);
      if (duration > 300) { // 5 minutes
        setError('Video is too long. Please use a video under 5 minutes.');
        return;
      }

      setSelectedFile(file);
      setVideoDuration(duration);
      
      // Create video URL for preview
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      // Set default prompt based on analysis type
      if (!userPrompt) {
        setDefaultPrompt(analysisType);
      }

    } catch (err) {
      setError('Error processing video file. Please try again.');
      console.error('File processing error:', err);
    }
  };

  // Set default prompts based on analysis type
  const setDefaultPrompt = (type: typeof analysisType) => {
    const defaultPrompts = {
      tactical: 'Analyze the tactical setup and formations in this football video. Focus on team shape, player positioning, attacking and defensive patterns, and provide tactical insights.',
      performance: 'Evaluate the individual and team performance in this football video. Analyze player decision making, passing accuracy, movement patterns, and overall effectiveness.',
      technical: 'Examine the technical skills displayed in this football video. Focus on first touch, passing technique, shooting, dribbling, and defensive techniques.',
      custom: 'Provide a comprehensive analysis of this football video, covering tactical, performance, and technical aspects as relevant.'
    };
    setUserPrompt(defaultPrompts[type]);
  };

  // Handle analysis type change
  const handleAnalysisTypeChange = (type: typeof analysisType) => {
    setAnalysisType(type);
    setDefaultPrompt(type);
  };

  // Start video analysis
  const startAnalysis = async () => {
    if (!selectedFile || !userPrompt.trim()) {
      setError('Please select a video file and enter an analysis prompt.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setUploadProgress(0);

    try {
      const request: FootballVideoAnalysisRequest = {
        videoFile: selectedFile,
        userPrompt: userPrompt.trim(),
        analysisType
      };

      // Determine whether to use File API or inline data
      const useFileAPI = await shouldUseFootballFileAPI(selectedFile);
      
      if (useFileAPI) {
        console.log('Using File API for large football video...');
        setUploadProgress(25);
        const result = await analyzeFootballVideoWithFileAPI(request);
        setUploadProgress(100);
        setAnalysisResult(result);
      } else {
        console.log('Using inline data for smaller football video...');
        setUploadProgress(50);
        const result = await analyzeFootballVideoWithGemini(request);
        setUploadProgress(100);
        setAnalysisResult(result);
      }

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred during video analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setUserPrompt('');
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Football Video Analysis
        </h1>
        <p className="text-lg text-gray-600">
          Upload your football video and get professional AI-powered analysis using Gemini 2.5 Pro
        </p>
      </div>

      {/* Video Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Upload Football Video</h2>
        
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/mov,video/avi,video/webm"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: MP4, MOV, AVI, WebM • Max duration: 5 minutes • Max size: 500MB
          </p>
        </div>

        {/* Video Preview */}
        {videoUrl && (
          <div className="mt-4">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full max-w-2xl rounded-lg"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setVideoDuration(videoRef.current.duration);
                }
              }}
            />
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">{selectedFile?.name}</span>
              {videoDuration > 0 && (
                <span className="ml-4">Duration: {formatDuration(videoDuration)}</span>
              )}
              <span className="ml-4">Size: {(selectedFile!.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Type Selection */}
      {selectedFile && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. Choose Analysis Type</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FOOTBALL_ANALYSIS_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleAnalysisTypeChange(type.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  analysisType === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className="font-semibold mb-1">{type.name}</div>
                <div className="text-sm text-gray-600">{type.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Prompt */}
      {selectedFile && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. Customize Analysis Prompt</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to analyze in this football video?
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter your specific analysis requirements..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
            <p className="text-sm text-gray-500 mt-2">
              Be specific about what you want to analyze. You can ask about tactics, individual performances, specific moments, formations, or any other aspect of the game.
            </p>
          </div>

          <button
            onClick={startAnalysis}
            disabled={isAnalyzing || !userPrompt.trim()}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              isAnalyzing || !userPrompt.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing Video...' : 'Start AI Analysis'}
          </button>

          {/* Progress Bar */}
          {isAnalyzing && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                {uploadProgress < 50 ? 'Uploading video...' : 'Analyzing with AI...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">AI Analysis Results</h2>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Analyze New Video
            </button>
          </div>

          {/* Analysis Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Processing Time:</span>
                <span className="ml-2">{(analysisResult.processingTime / 1000).toFixed(1)}s</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Video Size:</span>
                <span className="ml-2">{(analysisResult.videoMetadata.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Analysis Type:</span>
                <span className="ml-2 capitalize">{analysisType}</span>
              </div>
            </div>
          </div>

          {/* Analysis Content */}
          <div className="prose max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {analysisResult.analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedFile && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Upload a football video (MP4, MOV, AVI, or WebM format, max 5 minutes)</li>
            <li>Choose your analysis type: Tactical, Performance, Technical, or Custom</li>
            <li>Customize the analysis prompt to focus on specific aspects</li>
            <li>Click "Start AI Analysis" to get professional insights powered by Gemini 2.5 Pro</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Tips for Best Results:</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
              <li>Use clear, well-lit videos with good visibility of players and the field</li>
              <li>Include specific timestamps in your prompt if you want to focus on particular moments</li>
              <li>Be specific about what you want to analyze (e.g., "analyze the defensive shape during the 2nd goal")</li>
              <li>For tactical analysis, videos showing team formations and movements work best</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}