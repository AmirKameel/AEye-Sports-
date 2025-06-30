'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import VideoUploader from '@/components/VideoUploader';
import BoundingBoxSelector from '@/components/BoundingBoxSelector';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { BoundingBox, initializeTennisTracker, trackFrame, generateAnalysisResult } from '@/lib/tennis-tracker';

export default function PlayerAnalysis() {
  const { t } = useLanguage();
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [showBoundingBoxSelector, setShowBoundingBoxSelector] = useState(false);
  const [selectedBoxes, setSelectedBoxes] = useState<BoundingBox[] | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{width: number, height: number, duration: number} | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'accurate'>('quick');
  const [isMetadataReady, setIsMetadataReady] = useState(false);

  const handleUploadComplete = (url: string, name: string) => {
    console.log('Upload complete, URL:', url, 'Filename:', name);
    setVideoUrl(url);
    setFileName(name);
    setShowBoundingBoxSelector(false);
    setIsAnalyzing(false);
    setIsMetadataReady(false); // Reset metadata ready state

    // Create video element to load metadata
    const video = document.createElement('video');
    console.log('Created video element');
    video.src = url;
    video.crossOrigin = 'anonymous';

    // Handle metadata loading
    video.onloadedmetadata = () => {
      const metadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      };
      
      console.log('Video metadata loaded:', {
        ...metadata,
        readyState: video.readyState
      });

      setVideoMetadata(metadata);
      setIsMetadataReady(true);
    };

    video.onloadstart = () => console.log('Video load started');
    video.oncanplay = () => console.log('Video can play');
    video.oncanplaythrough = () => console.log('Video can play through');

    video.onerror = (e) => {
      console.error('Error loading video:', video.error);
      setError('Error loading video metadata');
    };

    console.log('Loading video...');
    video.load();
  };

  const startPlayerAnalysis = async () => {
    setShowUploader(true);
  };
  
  const handleBoxesSelected = (boxes: BoundingBox[]) => {
    if (!boxes.some(box => box.label === 'player') || !boxes.some(box => box.label === 'ball')) {
      setError('Please draw bounding boxes for both the player and the ball.');
      return;
    }

    setSelectedBoxes(boxes);
    setShowBoundingBoxSelector(false);
    
    // Start the tennis player analysis
    startTennisAnalysis(boxes);
  };
  
  const handleBoxSelectorCancel = () => {
    setShowBoundingBoxSelector(false);
    setShowUploader(false);
  };
  
  const startTennisAnalysis = async (boxes: BoundingBox[]) => {
    if (!videoUrl || !videoMetadata) {
      setError('Video not properly loaded. Please try again.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    setProcessingMessage("Initializing tennis analysis...");
    
    // Generate a unique ID for this analysis
    const newAnalysisId = `tennis-${uuidv4()}`;
    setAnalysisId(newAnalysisId);
    
    try {
      // Initialize tennis tracker with the selected bounding boxes
      const { initialFrame, pixelsToMeters } = initializeTennisTracker(
        boxes,
        videoMetadata.width,
        videoMetadata.height
      );
      
      // Create a video element to extract frames
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      
      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.load();
      });
      
      // Set video duration
      const duration = video.duration;
      
      // Calculate total frames to process (2 frames per second)
      const frameRate = 2;
      const totalFrames = Math.floor(duration * frameRate);
      
      // Store all frames
      const frames = [initialFrame];
      
      // Process frames
      for (let frameIndex = 1; frameIndex < totalFrames; frameIndex++) {
        // Calculate timestamp
        const timestamp = frameIndex / frameRate;
        
        // Update progress message
        if (frameIndex < totalFrames * 0.3) {
          setProcessingMessage("Extracting video frames...");
        } else if (frameIndex < totalFrames * 0.6) {
          setProcessingMessage("Tracking player and ball...");
        } else {
          setProcessingMessage("Analyzing player performance...");
        }
        
        try {
          // Seek to timestamp
          video.currentTime = timestamp;
          
          // Wait for seeking to complete
          await new Promise<void>((resolve) => {
            const handleSeeked = () => {
              video.removeEventListener('seeked', handleSeeked);
              resolve();
            };
            video.addEventListener('seeked', handleSeeked);
          });
          
          // Extract frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          
          if (!context) {
            throw new Error('Could not get canvas context');
          }
          
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64
          const frameBase64 = canvas.toDataURL('image/jpeg');
          
          // Track objects in this frame
          const frame = await trackFrame(
            frameBase64,
            frameIndex,
            timestamp,
            frames[frames.length - 1],
            pixelsToMeters
          );
          
          // Add frame to collection
          frames.push(frame);
          
          // Update progress
          setProgress((frameIndex / totalFrames) * 100);
        } catch (error) {
          console.error(`Error processing frame at ${timestamp}s:`, error);
          // Continue with next frame
        }
      }
      
      // Generate final analysis result
      const analysisResult = generateAnalysisResult(
        frames,
        {
          duration,
          width: videoMetadata.width,
          height: videoMetadata.height,
          fps: 30
        },
        pixelsToMeters
      );
      
      // Store result in localStorage
      localStorage.setItem(`analysis-${newAnalysisId}`, JSON.stringify(analysisResult));
      
      // Navigate to results page
      router.push(`/tennis/results/${newAnalysisId}?videoUrl=${encodeURIComponent(videoUrl)}`);
    } catch (error: any) {
      console.error('Error analyzing tennis video:', error);
      setError(error.message || 'Error analyzing video');
      setIsAnalyzing(false);
    }
  };

  const startAccurateTennisAnalysis = async () => {
    console.log('Starting accurate analysis with:', {
      videoUrl,
      videoMetadata,
      isAnalyzing
    });

    if (!videoUrl || !videoMetadata) {
      console.error('Missing required data:', { videoUrl, videoMetadata });
      setError('Video not properly loaded. Please try again.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    setProcessingMessage("Initializing accurate tennis analysis...");
    
    // Generate a unique ID for this analysis
    const newAnalysisId = `tennis-${uuidv4()}`;
    setAnalysisId(newAnalysisId);
    
    try {
      console.log('Importing accurate tracking modules...');
      const { initializeAccurateTracking, processAccurateFrame, generateAccurateAnalysis } = await import('@/lib/tennis-tracker-accurate');
      
      // Initialize tracking with first frame
      console.log('Creating video element for frame extraction');
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      
      console.log('Waiting for video metadata...');
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded in analysis:', {
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState
          });
          resolve();
        };
        video.onerror = (e) => {
          console.error('Video load error:', video.error);
          reject(new Error('Failed to load video'));
        };
        video.load();
      });

      // Get first frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      video.currentTime = 0;
      await new Promise<void>(resolve => {
        video.addEventListener('seeked', () => resolve(), { once: true });
      });
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const firstFrameBase64 = canvas.toDataURL('image/jpeg');
      
      // Initialize accurate tracking
      const { courtScale, initialPlayers } = await initializeAccurateTracking(
        firstFrameBase64,
        videoMetadata.width,
        videoMetadata.height
      );
      
      const duration = video.duration;
      const frameRate = 20; // Process 20 frames per second
      const totalFrames = Math.floor(duration * frameRate);
      
      // Create first frame array with initial data
      const frames = [{
        timestamp: 0,
        players: initialPlayers,
        courtScale
      }];
      
      // Process remaining frames
      for (let frameIndex = 1; frameIndex < totalFrames; frameIndex++) {
        const timestamp = frameIndex / frameRate;
        
        // Update progress message
        if (frameIndex < totalFrames * 0.3) {
          setProcessingMessage("Extracting video frames...");
        } else if (frameIndex < totalFrames * 0.6) {
          setProcessingMessage("Tracking players and court...");
        } else {
          setProcessingMessage("Calculating advanced metrics...");
        }
        
        try {
          video.currentTime = timestamp;
          await new Promise<void>(resolve => {
            video.addEventListener('seeked', () => resolve(), { once: true });
          });
          
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameBase64 = canvas.toDataURL('image/jpeg');
          
          const frame = await processAccurateFrame(
            frameBase64,
            timestamp,
            frames[frames.length - 1],
            courtScale
          );
          
          frames.push(frame);
          setProgress((frameIndex / totalFrames) * 100);
        } catch (error) {
          console.error(`Error processing frame at ${timestamp}s:`, error);
          // Continue with next frame
        }
      }
      
      // Generate final analysis
      const analysisResult = generateAccurateAnalysis(frames);
      
      // Store result in localStorage
      localStorage.setItem(`analysis-${newAnalysisId}`, JSON.stringify(analysisResult));
      
      // Navigate to results page
      router.push(`/tennis/results/${newAnalysisId}?videoUrl=${encodeURIComponent(videoUrl)}`);
    } catch (error: any) {
      console.error('Error in accurate tennis analysis:', error);
      setError(error.message || 'Error analyzing video');
      setIsAnalyzing(false);
    }
  };

  // Handle bounding box selector visibility for quick mode
  useEffect(() => {
    if (videoUrl && videoMetadata && analysisMode === 'quick') {
      setShowBoundingBoxSelector(true);
    }
  }, [videoUrl, videoMetadata, analysisMode]);

  // Watch for metadata ready state
  useEffect(() => {
    if (isMetadataReady && videoUrl && videoMetadata && analysisMode === 'accurate') {
      console.log('Metadata ready, starting analysis with:', {
        videoUrl,
        videoMetadata,
        isMetadataReady
      });
      startAccurateTennisAnalysis();
    }
  }, [isMetadataReady, videoUrl, videoMetadata, analysisMode]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('tennis.pages.playerAnalysis.title')}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {t('tennis.pages.playerAnalysis.subtitle')}
          </p>
        </div>

        {!showUploader && !showBoundingBoxSelector && !isAnalyzing && (
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">{t('tennis.pages.playerAnalysis.chooseAnalysisType')}</h2>
              
              {/* Analysis Mode Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Select Analysis Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    className={`p-4 rounded-lg border-2 text-left ${
                      analysisMode === 'quick' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setAnalysisMode('quick');
                      startPlayerAnalysis();
                    }}
                  >
                    <div className="font-semibold mb-2">Quick Analysis</div>
                    <p className="text-sm text-gray-600">
                      Faster processing with basic metrics. Best for quick performance feedback.
                    </p>
                  </button>

                  <button
                    className={`p-4 rounded-lg border-2 text-left ${
                      analysisMode === 'accurate' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      setAnalysisMode('accurate');
                      startPlayerAnalysis();
                    }}
                  >
                    <div className="font-semibold mb-2">Accurate Analysis</div>
                    <p className="text-sm text-gray-600">
                      Detailed multi-player tracking with advanced metrics. Takes longer but provides comprehensive insights.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showUploader && !showBoundingBoxSelector && !isAnalyzing && (
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{t('tennis.pages.playerAnalysis.uploadVideo')}</h2>
                <button 
                  onClick={() => setShowUploader(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← {t('common.back')}
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                {t('tennis.pages.playerAnalysis.uploadDescription')}
                <br />
                <strong>{t('common.note')}:</strong> {t('tennis.pages.playerAnalysis.uploadNote')}
              </p>
              <VideoUploader 
                sportType="tennis"
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </div>
        )}

        {videoUrl && showBoundingBoxSelector && !isAnalyzing && (
          <BoundingBoxSelector
            videoUrl={videoUrl || ''}
            onBoxesSelected={handleBoxesSelected}
            onCancel={handleBoxSelectorCancel}
          />
        )}
        
        {isAnalyzing && (
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{t('tennis.pages.playerAnalysis.analyzingVideo')}</h2>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">{processingMessage}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% {t('common.complete')}</p>
              </div>
              <p className="text-gray-600 italic text-sm mt-4">
                {t('tennis.pages.playerAnalysis.analysisWaitMessage')}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">{t('common.error')}: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            {t('common.backToTennis')}
          </button>
        </div>
      </div>
    </div>
  );
}