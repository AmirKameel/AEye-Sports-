import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with the provided API key
const GEMINI_API_KEY = 'AIzaSyCdN7JK1hpDaziMTfqY8V6GcYq00ufd-UI';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Get the Gemini 2.5 Pro model
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

export interface FootballVideoAnalysisRequest {
  videoFile: File;
  userPrompt: string;
  analysisType?: 'tactical' | 'performance' | 'technical' | 'custom';
}

export interface FootballVideoAnalysisResponse {
  analysis: string;
  processingTime: number;
  videoMetadata: {
    duration: number;
    size: number;
    format: string;
  };
}

// System prompts for different football analysis types
const FOOTBALL_SYSTEM_PROMPTS = {
  tactical: `You are a professional football tactical analyst with expertise in formations, team strategies, and game analysis.
  Analyze the football video focusing on:
  1. Team formations and tactical setups (4-4-2, 4-3-3, 3-5-2, etc.)
  2. Player positioning and movement patterns
  3. Attacking and defensive phases of play
  4. Set piece execution and organization
  5. Pressing triggers and defensive lines
  6. Space utilization and width in attack
  7. Transition moments (attack to defense and vice versa)
  
  Provide specific tactical insights with timestamps when possible. Use professional football terminology and reference specific tactical concepts.`,

  performance: `You are a football performance analyst specializing in individual and team performance metrics.
  Analyze the football video focusing on:
  1. Individual player performance and decision making
  2. Passing accuracy and distribution patterns
  3. Movement off the ball and positioning
  4. Defensive actions (tackles, interceptions, clearances)
  5. Attacking contributions (shots, crosses, key passes)
  6. Work rate and physical performance
  7. Technical skills execution under pressure
  
  Provide quantitative observations where possible and suggest performance improvements with specific examples.`,

  technical: `You are a football technical skills analyst focusing on individual technique and skill execution.
  Analyze the football video focusing on:
  1. First touch and ball control techniques
  2. Passing technique and accuracy (short, medium, long range)
  3. Shooting technique and finishing
  4. Dribbling skills and 1v1 situations
  5. Crossing and set piece delivery
  6. Defensive technique (tackling, heading, positioning)
  7. Goalkeeping technique (if applicable)
  
  Provide detailed technical feedback with specific timestamps and actionable improvement suggestions.`,

  custom: `You are a comprehensive football analyst with expertise in all aspects of the game.
  Analyze the football video thoroughly, providing insights on tactics, performance, and technical aspects as relevant.
  Focus on the specific aspects mentioned in the user's prompt while maintaining professional analysis standards.
  Cover team dynamics, individual performances, and strategic elements of the game.`
};

/**
 * Analyze football video using Gemini 2.5 Pro
 */
export async function analyzeFootballVideoWithGemini(request: FootballVideoAnalysisRequest): Promise<FootballVideoAnalysisResponse> {
  const startTime = Date.now();
  
  try {
    // Validate video file
    validateFootballVideoFile(request.videoFile);
    
    // Get system prompt based on analysis type
    const systemPrompt = FOOTBALL_SYSTEM_PROMPTS[request.analysisType || 'custom'];
    
    // Prepare the complete prompt
    const fullPrompt = `${systemPrompt}

USER REQUEST: ${request.userPrompt}

Please analyze this football video and provide detailed insights based on the above criteria. 
Include specific timestamps (MM:SS format) when referring to particular moments in the video.
Structure your response with clear headings and actionable recommendations.

Focus on:
- Team tactics and formations
- Individual player performances
- Key moments and turning points
- Areas for improvement
- Strategic recommendations`;

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

    console.log('Sending football video to Gemini 2.5 Pro for analysis...');
    
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
    console.error('Error analyzing football video with Gemini:', error);
    throw new Error(`Football video analysis failed: ${error.message}`);
  }
}

/**
 * Analyze football video using File API for larger files (>20MB or >1 minute)
 */
export async function analyzeFootballVideoWithFileAPI(request: FootballVideoAnalysisRequest): Promise<FootballVideoAnalysisResponse> {
  const startTime = Date.now();
  
  try {
    console.log('Uploading football video to Gemini File API...');
    
    // Upload file using File API
    const uploadResult = await genAI.fileManager.uploadFile(request.videoFile, {
      mimeType: request.videoFile.type,
    });

    console.log('Football video uploaded, waiting for processing...');
    
    // Wait for file to be processed
    let file = await genAI.fileManager.getFile(uploadResult.file.name);
    while (file.state === 'PROCESSING') {
      console.log('Football video still processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      file = await genAI.fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === 'FAILED') {
      throw new Error('Football video processing failed');
    }

    console.log('Football video processed, generating analysis...');

    // Get system prompt
    const systemPrompt = FOOTBALL_SYSTEM_PROMPTS[request.analysisType || 'custom'];
    
    // Prepare the complete prompt
    const fullPrompt = `${systemPrompt}

USER REQUEST: ${request.userPrompt}

Please analyze this football video and provide detailed insights based on the above criteria. 
Include specific timestamps (MM:SS format) when referring to particular moments in the video.
Structure your response with clear headings and actionable recommendations.

Focus on:
- Team tactics and formations
- Individual player performances
- Key moments and turning points
- Areas for improvement
- Strategic recommendations`;

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
    console.error('Error analyzing football video with Gemini File API:', error);
    throw new Error(`Football video analysis failed: ${error.message}`);
  }
}

/**
 * Validate football video file before processing
 */
function validateFootballVideoFile(file: File): void {
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
export function estimateFootballVideoDuration(file: File): Promise<number> {
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
export async function shouldUseFootballFileAPI(file: File): Promise<boolean> {
  // Use File API for files larger than 20MB
  if (file.size > 20 * 1024 * 1024) {
    return true;
  }
  
  // Try to estimate duration and use File API for videos longer than 1 minute
  try {
    const duration = await estimateFootballVideoDuration(file);
    return duration > 60; // 1 minute
  } catch {
    // If we can't determine duration, use file size as fallback
    return file.size > 10 * 1024 * 1024; // 10MB fallback
  }
}