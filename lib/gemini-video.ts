import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with the provided API key
const GEMINI_API_KEY = 'AIzaSyCdN7JK1hpDaziMTfqY8V6GcYq00ufd-UI';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Get the Gemini 2.5 Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

export interface VideoAnalysisRequest {
  videoFile: File;
  userPrompt: string;
  analysisType?: 'technique' | 'performance' | 'tactical' | 'custom';
}

export interface VideoAnalysisResponse {
  analysis: string;
  processingTime: number;
  videoMetadata: {
    duration: number;
    size: number;
    format: string;
  };
}

// System prompts for different analysis types
const SYSTEM_PROMPTS = {
  technique: `You are a professional tennis coach and analyst with expertise in biomechanics and technique analysis. 
  Analyze the tennis video focusing on:
  1. Player technique and form for each shot (serve, forehand, backhand, volley)
  2. Body positioning, footwork, and balance
  3. Racket preparation, swing path, and follow-through
  4. Timing and rhythm
  5. Areas for technical improvement
  
  Provide specific, actionable feedback with timestamps when possible. Use technical tennis terminology appropriately.`,

  performance: `You are a tennis performance analyst specializing in match analysis and player assessment.
  Analyze the tennis video focusing on:
  1. Shot selection and decision making
  2. Court positioning and movement patterns
  3. Consistency and accuracy of shots
  4. Energy levels and physical condition throughout the video
  5. Strengths and weaknesses in gameplay
  
  Provide quantitative observations where possible and suggest performance improvements.`,

  tactical: `You are a tennis tactics expert and strategic analyst.
  Analyze the tennis video focusing on:
  1. Strategic patterns and game plans
  2. Point construction and shot sequences
  3. Use of court geometry and angles
  4. Pressure situations and clutch performance
  5. Adaptation to opponent's style (if applicable)
  
  Provide tactical insights and strategic recommendations for improvement.`,

  custom: `You are a comprehensive tennis analyst with expertise in all aspects of the game.
  Analyze the tennis video thoroughly, providing insights on technique, performance, and tactics as relevant.
  Focus on the specific aspects mentioned in the user's prompt while maintaining professional analysis standards.`
};

/**
 * Analyze tennis video using Gemini 2.5 Pro
 */
export async function analyzeVideoWithGemini(request: VideoAnalysisRequest): Promise<VideoAnalysisResponse> {
  const startTime = Date.now();
  
  try {
    // Validate video file
    validateVideoFile(request.videoFile);
    
    // Get system prompt based on analysis type
    const systemPrompt = SYSTEM_PROMPTS[request.analysisType || 'custom'];
    
    // Prepare the complete prompt
    const fullPrompt = `${systemPrompt}

USER REQUEST: ${request.userPrompt}

Please analyze this tennis video and provide detailed insights based on the above criteria. 
Include specific timestamps (MM:SS format) when referring to particular moments in the video.
Structure your response with clear headings and actionable recommendations.`;

    // Convert video file to base64 for inline data (for videos < 20MB)
    const videoBase64 = await fileToBase64(request.videoFile);
    
    // Prepare content for Gemini
    const contents = [
      {
        inlineData: {
          mimeType: request.videoFile.type,
          data: videoBase64,
        },
      },
      { text: fullPrompt }
    ];

    console.log('Sending video to Gemini 2.5 Pro for analysis...');
    
    // Generate content using Gemini
    const result = await model.generateContent(contents);
    const response = await result.response;
    const analysisText = response.text();

    const processingTime = Date.now() - startTime;

    return {
      analysis: analysisText,
      processingTime,
      videoMetadata: {
        duration: 0, // Will be set by video element
        size: request.videoFile.size,
        format: request.videoFile.type
      }
    };

  } catch (error: any) {
    console.error('Error analyzing video with Gemini:', error);
    throw new Error(`Video analysis failed: ${error.message}`);
  }
}

/**
 * Analyze video using File API for larger files (>20MB or >1 minute)
 */
export async function analyzeVideoWithFileAPI(request: VideoAnalysisRequest): Promise<VideoAnalysisResponse> {
  const startTime = Date.now();
  
  try {
    console.log('Uploading video to Gemini File API...');
    
    // Upload file using File API
    const uploadResult = await genAI.fileManager.uploadFile(request.videoFile, {
      mimeType: request.videoFile.type,
    });

    console.log('Video uploaded, waiting for processing...');
    
    // Wait for file to be processed
    let file = await genAI.fileManager.getFile(uploadResult.file.name);
    while (file.state === 'PROCESSING') {
      console.log('Video still processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      file = await genAI.fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === 'FAILED') {
      throw new Error('Video processing failed');
    }

    console.log('Video processed, generating analysis...');

    // Get system prompt
    const systemPrompt = SYSTEM_PROMPTS[request.analysisType || 'custom'];
    
    // Prepare the complete prompt
    const fullPrompt = `${systemPrompt}

USER REQUEST: ${request.userPrompt}

Please analyze this tennis video and provide detailed insights based on the above criteria. 
Include specific timestamps (MM:SS format) when referring to particular moments in the video.
Structure your response with clear headings and actionable recommendations.`;

    // Generate content using the uploaded file
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri,
        },
      },
      { text: fullPrompt },
    ]);

    const response = await result.response;
    const analysisText = response.text();

    // Clean up uploaded file
    await genAI.fileManager.deleteFile(uploadResult.file.name);

    const processingTime = Date.now() - startTime;

    return {
      analysis: analysisText,
      processingTime,
      videoMetadata: {
        duration: 0, // Will be set by video element
        size: request.videoFile.size,
        format: request.videoFile.type
      }
    };

  } catch (error: any) {
    console.error('Error analyzing video with Gemini File API:', error);
    throw new Error(`Video analysis failed: ${error.message}`);
  }
}

/**
 * Validate video file before processing
 */
function validateVideoFile(file: File): void {
  // Check file size (5 minutes of video is roughly 50-100MB depending on quality)
  const maxSize = 500 * 1024 * 1024; // 500MB to be safe
  if (file.size > maxSize) {
    throw new Error('Video file is too large. Please use a video under 500MB.');
  }

  // Check file type
  const supportedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/mov',
    'video/avi',
    'video/x-flv',
    'video/mpg',
    'video/webm',
    'video/wmv',
    'video/3gpp'
  ];

  if (!supportedTypes.includes(file.type)) {
    throw new Error(`Unsupported video format: ${file.type}. Please use MP4, MOV, AVI, or WebM.`);
  }
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Estimate video duration from file (rough estimation)
 */
export function estimateVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      resolve(0); // Return 0 if can't determine duration
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Determine whether to use inline data or File API based on file size and duration
 */
export async function shouldUseFileAPI(file: File): Promise<boolean> {
  // Use File API for files larger than 20MB
  if (file.size > 20 * 1024 * 1024) {
    return true;
  }
  
  // Try to estimate duration and use File API for videos longer than 1 minute
  try {
    const duration = await estimateVideoDuration(file);
    return duration > 60; // 1 minute
  } catch {
    // If we can't determine duration, use file size as fallback
    return file.size > 10 * 1024 * 1024; // 10MB fallback
  }
}