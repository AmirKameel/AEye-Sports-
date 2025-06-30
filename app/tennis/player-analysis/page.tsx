'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import VideoUploader from '@/components/VideoUploader';
import BoundingBoxSelector from '@/components/BoundingBoxSelector';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { 
  EnhancedBoundingBox, 
  initializeEnhancedTennisTracker, 
  trackFrameEnhanced,
  EnhancedTrackingFrame 
} from '@/lib/tennis-tracker-enhanced';

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
  const [selectedBoxes, setSelectedBoxes] = useState<EnhancedBoundingBox[] | null>(null);
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
    setIsMetadataReady(false);

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
  
  const handleBoxesSelected = (boxes: any[]) => {
    // Convert to EnhancedBoundingBox format
    const enhancedBoxes: EnhancedBoundingBox[] = boxes.map(box => ({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      label: box.label as 'player' | 'ball',
      confidence: 1.0
    }));

    if (!enhancedBoxes.some(box => box.label === 'player') || !enhancedBoxes.some(box => box.label === 'ball')) {
      setError('Please draw bounding boxes for both the player and the ball.');
      return;
    }

    setSelectedBoxes(enhancedBoxes);
    setShowBoundingBoxSelector(false);
    
    // Start the enhanced tennis analysis
    startEnhancedTennisAnalysis(enhancedBoxes);
  };
  
  const handleBoxSelectorCancel = () => {
    setShowBoundingBoxSelector(false);
    setShowUploader(false);
  };
  
  const startEnhancedTennisAnalysis = async (boxes: EnhancedBoundingBox[]) => {
    if (!videoUrl || !videoMetadata) {
      setError('Video not properly loaded. Please try again.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    setProcessingMessage("Initializing enhanced tennis analysis...");
    
    // Generate a unique ID for this analysis
    const newAnalysisId = `tennis-enhanced-${uuidv4()}`;
    setAnalysisId(newAnalysisId);
    
    try {
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
      
      // Extract first frame for court detection
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
      
      setProcessingMessage("Detecting court boundaries...");
      
      // Initialize enhanced tennis tracker with court detection
      const { initialFrame, courtBoundaries } = await initializeEnhancedTennisTracker(
        boxes,
        firstFrameBase64,
        videoMetadata.width,
        videoMetadata.height
      );
      
      setProcessingMessage("Court detected! Starting player and ball tracking...");
      
      const duration = video.duration;
      const frameRate = 3; // Process 3 frames per second for better accuracy
      const totalFrames = Math.floor(duration * frameRate);
      
      // Store all frames
      const frames: EnhancedTrackingFrame[] = [initialFrame];
      
      // Process frames
      for (let frameIndex = 1; frameIndex < totalFrames; frameIndex++) {
        const timestamp = frameIndex / frameRate;
        
        // Update progress message
        if (frameIndex < totalFrames * 0.3) {
          setProcessingMessage("Extracting video frames...");
        } else if (frameIndex < totalFrames * 0.6) {
          setProcessingMessage("Tracking player and ball with enhanced detection...");
        } else if (frameIndex < totalFrames * 0.8) {
          setProcessingMessage("Analyzing shot types and techniques...");
        } else {
          setProcessingMessage("Generating comprehensive analysis...");
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
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameBase64 = canvas.toDataURL('image/jpeg');
          
          // Track objects in this frame with enhanced detection
          const frame = await trackFrameEnhanced(
            frameBase64,
            frameIndex,
            timestamp,
            frames
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
      
      setProcessingMessage("Compiling final analysis results...");
      
      // Generate enhanced analysis result
      const analysisResult = generateEnhancedAnalysisResult(frames, videoMetadata, courtBoundaries);
      
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

  // Generate enhanced analysis result
  function generateEnhancedAnalysisResult(frames: EnhancedTrackingFrame[], videoMetadata: any, courtBoundaries: any) {
    // Calculate comprehensive statistics
    const shots = frames.filter(frame => frame.shotAnalysis?.isShot);
    const shotTypes = shots.reduce((acc: any, frame) => {
      const shotType = frame.shotAnalysis?.shotType || 'unknown';
      acc[shotType] = (acc[shotType] || 0) + 1;
      return acc;
    }, {});

    // Calculate player speeds
    const playerSpeeds = frames
      .filter(frame => frame.playerSpeed > 0)
      .map(frame => frame.playerSpeed);

    // Calculate ball speeds
    const ballSpeeds = frames
      .filter(frame => frame.ballSpeed > 0)
      .map(frame => frame.ballSpeed);

    // Generate position heatmap
    const heatmap = generatePositionHeatmap(frames, courtBoundaries);

    // Calculate court coverage
    const courtCoverage = calculateCourtCoverage(frames, courtBoundaries);

    return {
      playerStats: {
        averageSpeed: playerSpeeds.length > 0 ? playerSpeeds.reduce((a, b) => a + b, 0) / playerSpeeds.length : 0,
        maxSpeed: playerSpeeds.length > 0 ? Math.max(...playerSpeeds) : 0,
        totalDistanceCovered: frames[frames.length - 1]?.totalPlayerDistanceCovered || 0,
        positionHeatmap: heatmap,
        shotsHit: shots.length,
        forehandCount: shotTypes.forehand || 0,
        backhandCount: shotTypes.backhand || 0,
        serveCount: shotTypes.serve || 0,
        volleyCount: shotTypes.volley || 0,
        overheadCount: shotTypes.overhead || 0
      },
      shotStats: {
        averageBallSpeed: ballSpeeds.length > 0 ? ballSpeeds.reduce((a, b) => a + b, 0) / ballSpeeds.length : 0,
        maxBallSpeed: ballSpeeds.length > 0 ? Math.max(...ballSpeeds) : 0,
        shotTypes: shotTypes,
        shotAccuracy: calculateShotAccuracy(shots),
        shotDistribution: calculateShotDistribution(shots, courtBoundaries)
      },
      courtCoverage,
      videoMetadata: {
        duration: videoMetadata.duration,
        width: videoMetadata.width,
        height: videoMetadata.height
      },
      frames: frames.map(frame => ({
        timestamp: frame.timestamp,
        playerSpeed: frame.playerSpeed,
        ballSpeed: frame.ballSpeed,
        isShot: frame.shotAnalysis?.isShot || false,
        shotType: frame.shotAnalysis?.shotType,
        shotConfidence: frame.shotAnalysis?.confidence,
        playerPosition: frame.player ? {
          x: frame.player.centerX,
          y: frame.player.centerY
        } : undefined,
        ballPosition: frame.ball ? {
          x: frame.ball.centerX,
          y: frame.ball.centerY
        } : undefined
      })),
      enhancedMode: true,
      courtBoundaries: courtBoundaries
    };
  }

  function generatePositionHeatmap(frames: EnhancedTrackingFrame[], courtBoundaries: any): number[][] {
    const gridSize = 10;
    const heatmap = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    frames.forEach(frame => {
      if (frame.player) {
        const gridX = Math.min(gridSize - 1, Math.floor((frame.player.centerX / courtBoundaries.courtWidth) * gridSize));
        const gridY = Math.min(gridSize - 1, Math.floor((frame.player.centerY / courtBoundaries.courtHeight) * gridSize));
        heatmap[gridY][gridX]++;
      }
    });
    
    return heatmap;
  }

  function calculateCourtCoverage(frames: EnhancedTrackingFrame[], courtBoundaries: any): number {
    const gridSize = 10;
    const visited = new Set<string>();
    
    frames.forEach(frame => {
      if (frame.player) {
        const gridX = Math.min(gridSize - 1, Math.floor((frame.player.centerX / courtBoundaries.courtWidth) * gridSize));
        const gridY = Math.min(gridSize - 1, Math.floor((frame.player.centerY / courtBoundaries.courtHeight) * gridSize));
        visited.add(`${gridX},${gridY}`);
      }
    });
    
    return (visited.size / (gridSize * gridSize)) * 100;
  }

  function calculateShotAccuracy(shots: EnhancedTrackingFrame[]): number {
    // Simplified accuracy calculation based on shot confidence
    if (shots.length === 0) return 0;
    
    const totalConfidence = shots.reduce((sum, shot) => sum + (shot.shotAnalysis?.confidence || 0), 0);
    return (totalConfidence / shots.length) * 100;
  }

  function calculateShotDistribution(shots: EnhancedTrackingFrame[], courtBoundaries: any): any {
    const distribution = {
      crosscourt: 0,
      downTheLine: 0,
      center: 0
    };
    
    shots.forEach(shot => {
      const direction = shot.shotAnalysis?.shotDirection || 'unknown';
      if (direction === 'crosscourt') distribution.crosscourt++;
      else if (direction === 'down-the-line') distribution.downTheLine++;
      else if (direction === 'center') distribution.center++;
    });
    
    return distribution;
  }

  // Handle bounding box selector visibility for quick mode
  useEffect(() => {
    if (videoUrl && videoMetadata && analysisMode === 'quick') {
      setShowBoundingBoxSelector(true);
    }
  }, [videoUrl, videoMetadata, analysisMode]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('tennis.pages.playerAnalysis.title')}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Enhanced Tennis Analysis with Accurate Shot Detection
          </p>
        </div>

        {!showUploader && !showBoundingBoxSelector && !isAnalyzing && (
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">Enhanced Tennis Analysis</h2>
              
              <div className="mb-8">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">🎾 Enhanced Shot Detection Features</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Automatic court boundary detection</li>
                    <li>✅ Accurate shot type classification (Serve, Forehand, Backhand, Volley, Overhead)</li>
                    <li>✅ Advanced ball trajectory analysis</li>
                    <li>✅ Player movement pattern recognition</li>
                    <li>✅ Shot direction analysis (Crosscourt, Down-the-line, Center)</li>
                    <li>✅ Confidence scoring for each detected shot</li>
                  </ul>
                </div>

                <button
                  className="w-full p-6 rounded-lg border-2 border-blue-500 bg-blue-50 text-left hover:bg-blue-100 transition-colors"
                  onClick={startPlayerAnalysis}
                >
                  <div className="font-semibold text-lg mb-2">🚀 Start Enhanced Analysis</div>
                  <p className="text-sm text-gray-600">
                    Upload your tennis video for comprehensive analysis with improved shot detection accuracy.
                    The system will automatically detect court boundaries and provide detailed insights.
                  </p>
                </button>
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
                Upload a tennis video for enhanced analysis. For best results, use a video that clearly shows the player, ball, and court lines.
                <br />
                <strong>{t('common.note')}:</strong> The enhanced system will automatically detect court boundaries and provide more accurate shot classification.
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
              <h2 className="text-xl font-semibold mb-4">🎾 Enhanced Tennis Analysis in Progress</h2>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">{processingMessage}</p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% {t('common.complete')}</p>
              </div>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  <strong>Enhanced Processing:</strong> The system is performing advanced court detection, 
                  multi-criteria shot analysis, and accurate shot type classification. This provides 
                  significantly better results than basic analysis.
                </p>
              </div>
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
          <Link
            href="/tennis"
            className="text-blue-600 hover:text-blue-800"
          >
            {t('common.backToTennis')}
          </Link>
        </div>
      </div>
    </div>
  );
}