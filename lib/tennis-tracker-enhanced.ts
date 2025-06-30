import axios from 'axios';

// Enhanced constants for better shot detection
const SHOT_DETECTION_CONFIG = {
  // Adaptive distance thresholds based on court size
  PROXIMITY_THRESHOLD_RATIO: 0.08, // 8% of court width
  MIN_PROXIMITY_PIXELS: 50,
  MAX_PROXIMITY_PIXELS: 150,
  
  // Ball speed thresholds (km/h)
  MIN_SHOT_SPEED: 25, // Lowered from 54 km/h (15 m/s)
  SERVE_MIN_SPEED: 60,
  VOLLEY_MAX_SPEED: 80,
  OVERHEAD_MIN_SPEED: 70,
  
  // Direction change detection
  MIN_DIRECTION_CHANGE: 30, // degrees
  TRAJECTORY_MEMORY: 20, // Increased from 10
  
  // Court detection
  COURT_LINE_CONFIDENCE: 0.7,
  NET_DETECTION_CONFIDENCE: 0.8,
};

// Enhanced interfaces
export interface EnhancedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: 'player' | 'ball' | 'racket' | 'net' | 'court';
  confidence?: number;
}

export interface CourtBoundaries {
  baseline1: { x1: number; y1: number; x2: number; y2: number };
  baseline2: { x1: number; y1: number; x2: number; y2: number };
  sideline1: { x1: number; y1: number; x2: number; y2: number };
  sideline2: { x1: number; y1: number; x2: number; y2: number };
  serviceLine1: { x1: number; y1: number; x2: number; y2: number };
  serviceLine2: { x1: number; y1: number; x2: number; y2: number };
  centerLine: { x1: number; y1: number; x2: number; y2: number };
  net: { x1: number; y1: number; x2: number; y2: number };
  courtWidth: number;
  courtHeight: number;
  pixelsToMeters: number;
}

export interface BallTrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
  speed: number;
  confidence: number;
  height?: number; // Estimated ball height
  spin?: 'topspin' | 'backspin' | 'sidespin' | 'flat';
}

export interface PlayerMovementData {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  bodyOrientation: number; // degrees
  racketPosition?: { x: number; y: number };
  isMovingToNet: boolean;
  isAtBaseline: boolean;
  isAtNet: boolean;
}

export interface ShotAnalysis {
  isShot: boolean;
  shotType: 'serve' | 'forehand' | 'backhand' | 'volley' | 'overhead' | 'unknown';
  confidence: number;
  ballSpeed: number;
  playerPosition: 'baseline' | 'midcourt' | 'net' | 'unknown';
  shotDirection: 'crosscourt' | 'down-the-line' | 'center' | 'unknown';
  ballHeight: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface EnhancedTrackingFrame {
  frameId: number;
  timestamp: number;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    confidence: number;
    movement?: PlayerMovementData;
  } | null;
  ball: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    confidence: number;
    trajectory?: BallTrajectoryPoint;
  } | null;
  courtInfo: CourtBoundaries;
  shotAnalysis?: ShotAnalysis;
  distancePlayerToBall: number;
  playerSpeed: number;
  ballSpeed: number;
  playerDistanceCovered: number;
  totalPlayerDistanceCovered: number;
}

// Global trajectory tracking
const ballTrajectoryHistory: BallTrajectoryPoint[] = [];
const playerMovementHistory: PlayerMovementData[] = [];

// Roboflow API configuration
const TENNIS_MODELS = {
  PLAYER_BALL: 'tennis-vhrs9/9',
  COURT_DETECTION: 'tennis-court-detection/1', // You may need to find/train this
  BALL_ONLY: 'tennis-ball-detection-uuvje/1'
};

const ROBOFLOW_API_KEY = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY;

/**
 * Enhanced court detection using multiple methods
 */
export async function detectCourtBoundaries(
  imageBase64: string,
  videoWidth: number,
  videoHeight: number
): Promise<CourtBoundaries> {
  try {
    const base64Data = imageBase64.split('base64,')[1];
    
    // Try to detect court lines using Roboflow
    let courtDetections: any[] = [];
    try {
      const response = await axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${TENNIS_MODELS.COURT_DETECTION}?api_key=${ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      courtDetections = response.data.predictions || [];
    } catch (error) {
      console.log('Court detection model not available, using estimation');
    }

    // Detect net position for calibration
    const playerBallResponse = await axios({
      method: 'POST',
      url: `https://detect.roboflow.com/${TENNIS_MODELS.PLAYER_BALL}?api_key=${ROBOFLOW_API_KEY}`,
      data: base64Data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const netDetection = playerBallResponse.data.predictions?.find(
      (pred: any) => pred.class === 'net' && pred.confidence > SHOT_DETECTION_CONFIG.NET_DETECTION_CONFIDENCE
    );

    let courtBoundaries: CourtBoundaries;

    if (netDetection) {
      // Use net detection for accurate court calibration
      courtBoundaries = calibrateCourtFromNet(netDetection, videoWidth, videoHeight);
    } else if (courtDetections.length > 0) {
      // Use detected court lines
      courtBoundaries = extractCourtFromDetections(courtDetections, videoWidth, videoHeight);
    } else {
      // Fallback to estimated court boundaries
      courtBoundaries = estimateCourtBoundaries(videoWidth, videoHeight);
    }

    return courtBoundaries;
  } catch (error) {
    console.error('Error detecting court boundaries:', error);
    return estimateCourtBoundaries(videoWidth, videoHeight);
  }
}

/**
 * Calibrate court boundaries using net detection
 */
function calibrateCourtFromNet(
  netDetection: any,
  videoWidth: number,
  videoHeight: number
): CourtBoundaries {
  const netCenterX = netDetection.x;
  const netCenterY = netDetection.y;
  const netWidth = netDetection.width;
  
  // Standard tennis court dimensions (meters)
  const COURT_LENGTH = 23.77;
  const COURT_WIDTH = 10.97; // Singles court
  const NET_HEIGHT = 0.914;
  
  // Calculate pixels to meters ratio using net width
  // Assuming net spans the full court width
  const pixelsToMeters = COURT_WIDTH / netWidth;
  
  // Calculate court boundaries based on net position
  const courtWidth = netWidth;
  const courtHeight = (COURT_LENGTH / COURT_WIDTH) * netWidth;
  
  const courtLeft = netCenterX - courtWidth / 2;
  const courtRight = netCenterX + courtWidth / 2;
  const courtTop = netCenterY - courtHeight / 2;
  const courtBottom = netCenterY + courtHeight / 2;
  
  return {
    baseline1: { x1: courtLeft, y1: courtTop, x2: courtRight, y2: courtTop },
    baseline2: { x1: courtLeft, y1: courtBottom, x2: courtRight, y2: courtBottom },
    sideline1: { x1: courtLeft, y1: courtTop, x2: courtLeft, y2: courtBottom },
    sideline2: { x1: courtRight, y1: courtTop, x2: courtRight, y2: courtBottom },
    serviceLine1: { x1: courtLeft, y1: netCenterY - courtHeight * 0.21, x2: courtRight, y2: netCenterY - courtHeight * 0.21 },
    serviceLine2: { x1: courtLeft, y1: netCenterY + courtHeight * 0.21, x2: courtRight, y2: netCenterY + courtHeight * 0.21 },
    centerLine: { x1: netCenterX, y1: netCenterY - courtHeight * 0.21, x2: netCenterX, y2: netCenterY + courtHeight * 0.21 },
    net: { x1: courtLeft, y1: netCenterY, x2: courtRight, y2: netCenterY },
    courtWidth,
    courtHeight,
    pixelsToMeters
  };
}

/**
 * Extract court boundaries from detected court lines
 */
function extractCourtFromDetections(
  detections: any[],
  videoWidth: number,
  videoHeight: number
): CourtBoundaries {
  // Process detected lines and extract court boundaries
  // This would need to be implemented based on the specific court detection model
  // For now, fall back to estimation
  return estimateCourtBoundaries(videoWidth, videoHeight);
}

/**
 * Estimate court boundaries when detection fails
 */
function estimateCourtBoundaries(videoWidth: number, videoHeight: number): CourtBoundaries {
  // Assume court takes up 80% of the frame
  const courtWidth = videoWidth * 0.8;
  const courtHeight = videoHeight * 0.8;
  const courtLeft = (videoWidth - courtWidth) / 2;
  const courtTop = (videoHeight - courtHeight) / 2;
  const courtRight = courtLeft + courtWidth;
  const courtBottom = courtTop + courtHeight;
  const netY = videoHeight / 2;
  
  // Estimate pixels to meters ratio
  const pixelsToMeters = 10.97 / courtWidth; // Singles court width
  
  return {
    baseline1: { x1: courtLeft, y1: courtTop, x2: courtRight, y2: courtTop },
    baseline2: { x1: courtLeft, y1: courtBottom, x2: courtRight, y2: courtBottom },
    sideline1: { x1: courtLeft, y1: courtTop, x2: courtLeft, y2: courtBottom },
    sideline2: { x1: courtRight, y1: courtTop, x2: courtRight, y2: courtBottom },
    serviceLine1: { x1: courtLeft, y1: netY - courtHeight * 0.21, x2: courtRight, y2: netY - courtHeight * 0.21 },
    serviceLine2: { x1: courtLeft, y1: netY + courtHeight * 0.21, x2: courtRight, y2: netY + courtHeight * 0.21 },
    centerLine: { x1: (courtLeft + courtRight) / 2, y1: netY - courtHeight * 0.21, x2: (courtLeft + courtRight) / 2, y2: netY + courtHeight * 0.21 },
    net: { x1: courtLeft, y1: netY, x2: courtRight, y2: netY },
    courtWidth,
    courtHeight,
    pixelsToMeters
  };
}

/**
 * Enhanced shot detection with multiple criteria
 */
export function detectShotEnhanced(
  currentFrame: EnhancedTrackingFrame,
  previousFrames: EnhancedTrackingFrame[]
): ShotAnalysis {
  if (!currentFrame.player || !currentFrame.ball || previousFrames.length < 3) {
    return {
      isShot: false,
      shotType: 'unknown',
      confidence: 0,
      ballSpeed: 0,
      playerPosition: 'unknown',
      shotDirection: 'unknown',
      ballHeight: 'medium',
      timestamp: currentFrame.timestamp
    };
  }

  const { player, ball, courtInfo } = currentFrame;
  const previousFrame = previousFrames[previousFrames.length - 1];
  
  // Calculate adaptive proximity threshold
  const proximityThreshold = Math.max(
    SHOT_DETECTION_CONFIG.MIN_PROXIMITY_PIXELS,
    Math.min(
      SHOT_DETECTION_CONFIG.MAX_PROXIMITY_PIXELS,
      courtInfo.courtWidth * SHOT_DETECTION_CONFIG.PROXIMITY_THRESHOLD_RATIO
    )
  );

  // Multi-criteria shot detection
  const criteria = {
    proximity: currentFrame.distancePlayerToBall < proximityThreshold,
    ballSpeedIncrease: currentFrame.ballSpeed > SHOT_DETECTION_CONFIG.MIN_SHOT_SPEED,
    directionChange: detectBallDirectionChange(ballTrajectoryHistory),
    playerMovement: detectPlayerSwingMotion(playerMovementHistory),
    temporalConsistency: validateShotTiming(previousFrames)
  };

  // Calculate shot confidence
  const confidence = calculateShotConfidence(criteria, currentFrame, previousFrames);
  
  if (confidence < 0.6) {
    return {
      isShot: false,
      shotType: 'unknown',
      confidence,
      ballSpeed: currentFrame.ballSpeed,
      playerPosition: getPlayerPosition(player, courtInfo),
      shotDirection: 'unknown',
      ballHeight: estimateBallHeight(ball, courtInfo),
      timestamp: currentFrame.timestamp
    };
  }

  // Determine shot type
  const shotType = determineShotTypeEnhanced(currentFrame, previousFrames);
  const shotDirection = determineShotDirection(currentFrame, previousFrames);

  return {
    isShot: true,
    shotType,
    confidence,
    ballSpeed: currentFrame.ballSpeed,
    playerPosition: getPlayerPosition(player, courtInfo),
    shotDirection,
    ballHeight: estimateBallHeight(ball, courtInfo),
    timestamp: currentFrame.timestamp
  };
}

/**
 * Enhanced shot type determination
 */
function determineShotTypeEnhanced(
  currentFrame: EnhancedTrackingFrame,
  previousFrames: EnhancedTrackingFrame[]
): 'serve' | 'forehand' | 'backhand' | 'volley' | 'overhead' | 'unknown' {
  const { player, ball, courtInfo } = currentFrame;
  if (!player || !ball) return 'unknown';

  const playerPosition = getPlayerPosition(player, courtInfo);
  const ballHeight = estimateBallHeight(ball, courtInfo);
  const ballSpeed = currentFrame.ballSpeed;
  
  // Analyze player movement pattern
  const playerMovement = analyzePlayerMovement(previousFrames);
  const ballApproach = analyzeBallApproach(previousFrames);

  // SERVE detection
  if (isServeDetected(currentFrame, previousFrames, playerPosition, ballHeight, ballSpeed)) {
    return 'serve';
  }

  // OVERHEAD detection
  if (isOverheadDetected(ballHeight, ballSpeed, playerMovement, ballApproach)) {
    return 'overhead';
  }

  // VOLLEY detection
  if (isVolleyDetected(playerPosition, ballSpeed, ballApproach)) {
    return 'volley';
  }

  // FOREHAND vs BACKHAND detection
  return determineForehandBackhand(currentFrame, previousFrames, playerMovement, ballApproach);
}

/**
 * Serve detection logic
 */
function isServeDetected(
  currentFrame: EnhancedTrackingFrame,
  previousFrames: EnhancedTrackingFrame[],
  playerPosition: string,
  ballHeight: string,
  ballSpeed: number
): boolean {
  // Check if player is at baseline
  if (playerPosition !== 'baseline') return false;
  
  // Check ball speed (serves are typically faster)
  if (ballSpeed < SHOT_DETECTION_CONFIG.SERVE_MIN_SPEED) return false;
  
  // Check if ball was high (toss for serve)
  if (ballHeight !== 'high') return false;
  
  // Check for serve preparation pattern in previous frames
  const hasServeToss = previousFrames.slice(-10).some(frame => {
    if (!frame.ball) return false;
    const prevBallHeight = estimateBallHeight(frame.ball, frame.courtInfo);
    return prevBallHeight === 'high' && frame.ball.centerY < currentFrame.ball!.centerY;
  });
  
  return hasServeToss;
}

/**
 * Overhead detection logic
 */
function isOverheadDetected(
  ballHeight: string,
  ballSpeed: number,
  playerMovement: any,
  ballApproach: any
): boolean {
  return (
    ballHeight === 'high' &&
    ballSpeed > SHOT_DETECTION_CONFIG.OVERHEAD_MIN_SPEED &&
    ballApproach.fromAbove
  );
}

/**
 * Volley detection logic
 */
function isVolleyDetected(
  playerPosition: string,
  ballSpeed: number,
  ballApproach: any
): boolean {
  return (
    playerPosition === 'net' &&
    ballSpeed < SHOT_DETECTION_CONFIG.VOLLEY_MAX_SPEED &&
    !ballApproach.afterBounce
  );
}

/**
 * Forehand vs Backhand determination
 */
function determineForehandBackhand(
  currentFrame: EnhancedTrackingFrame,
  previousFrames: EnhancedTrackingFrame[],
  playerMovement: any,
  ballApproach: any
): 'forehand' | 'backhand' {
  const { player, ball } = currentFrame;
  if (!player || !ball) return 'forehand';

  // Analyze ball position relative to player
  const ballRelativeToPlayer = ball.centerX - player.centerX;
  
  // Analyze player body orientation and movement
  const playerTurnDirection = analyzePlayerTurnDirection(previousFrames);
  
  // Combine multiple factors
  const forehandIndicators = [
    ballRelativeToPlayer > 0, // Ball on right side (for right-handed player)
    playerTurnDirection === 'right',
    playerMovement.swingDirection === 'right'
  ].filter(Boolean).length;

  return forehandIndicators >= 2 ? 'forehand' : 'backhand';
}

/**
 * Helper functions for analysis
 */
function detectBallDirectionChange(trajectory: BallTrajectoryPoint[]): boolean {
  if (trajectory.length < 3) return false;
  
  const recent = trajectory.slice(-3);
  const [p1, p2, p3] = recent;
  
  const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  const angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);
  
  return angleDiff > SHOT_DETECTION_CONFIG.MIN_DIRECTION_CHANGE;
}

function detectPlayerSwingMotion(movement: PlayerMovementData[]): boolean {
  if (movement.length < 5) return false;
  
  // Analyze acceleration patterns for swing motion
  const recentMovement = movement.slice(-5);
  const accelerationChanges = recentMovement.map((m, i) => {
    if (i === 0) return 0;
    const prev = recentMovement[i - 1];
    return Math.sqrt(
      Math.pow(m.acceleration.x - prev.acceleration.x, 2) +
      Math.pow(m.acceleration.y - prev.acceleration.y, 2)
    );
  });
  
  const maxAccelerationChange = Math.max(...accelerationChanges);
  return maxAccelerationChange > 5; // Threshold for swing motion
}

function validateShotTiming(frames: EnhancedTrackingFrame[]): boolean {
  // Check if the timing is consistent with a shot
  // (e.g., not too soon after the last shot)
  if (frames.length < 10) return true;
  
  const recentShots = frames.slice(-30).filter(f => f.shotAnalysis?.isShot);
  if (recentShots.length === 0) return true;
  
  const lastShot = recentShots[recentShots.length - 1];
  const timeSinceLastShot = frames[frames.length - 1].timestamp - lastShot.timestamp;
  
  return timeSinceLastShot > 1000; // At least 1 second between shots
}

function calculateShotConfidence(
  criteria: any,
  currentFrame: EnhancedTrackingFrame,
  previousFrames: EnhancedTrackingFrame[]
): number {
  let confidence = 0;
  
  if (criteria.proximity) confidence += 0.3;
  if (criteria.ballSpeedIncrease) confidence += 0.25;
  if (criteria.directionChange) confidence += 0.2;
  if (criteria.playerMovement) confidence += 0.15;
  if (criteria.temporalConsistency) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

function getPlayerPosition(
  player: any,
  courtInfo: CourtBoundaries
): 'baseline' | 'midcourt' | 'net' | 'unknown' {
  const distanceToBaseline1 = Math.abs(player.centerY - courtInfo.baseline1.y1);
  const distanceToBaseline2 = Math.abs(player.centerY - courtInfo.baseline2.y1);
  const distanceToNet = Math.abs(player.centerY - courtInfo.net.y1);
  
  const minDistanceToBaseline = Math.min(distanceToBaseline1, distanceToBaseline2);
  
  if (minDistanceToBaseline < courtInfo.courtHeight * 0.15) {
    return 'baseline';
  } else if (distanceToNet < courtInfo.courtHeight * 0.2) {
    return 'net';
  } else {
    return 'midcourt';
  }
}

function estimateBallHeight(ball: any, courtInfo: CourtBoundaries): 'low' | 'medium' | 'high' {
  const relativeHeight = (courtInfo.baseline1.y1 - ball.centerY) / courtInfo.courtHeight;
  
  if (relativeHeight < 0.3) return 'low';
  if (relativeHeight > 0.7) return 'high';
  return 'medium';
}

function analyzePlayerMovement(frames: EnhancedTrackingFrame[]): any {
  // Analyze player movement patterns
  return {
    swingDirection: 'right', // Simplified
    isMovingToNet: false,
    bodyOrientation: 0
  };
}

function analyzeBallApproach(frames: EnhancedTrackingFrame[]): any {
  // Analyze how the ball approached the player
  return {
    fromAbove: false,
    afterBounce: true,
    speed: 0
  };
}

function analyzePlayerTurnDirection(frames: EnhancedTrackingFrame[]): 'left' | 'right' | 'none' {
  if (frames.length < 3) return 'none';
  
  const recent = frames.slice(-3);
  const orientationChanges = recent.map((frame, i) => {
    if (i === 0 || !frame.player) return 0;
    const prev = recent[i - 1];
    if (!prev.player) return 0;
    return frame.player.centerX - prev.player.centerX;
  });
  
  const totalChange = orientationChanges.reduce((sum, change) => sum + change, 0);
  
  if (totalChange > 10) return 'right';
  if (totalChange < -10) return 'left';
  return 'none';
}

function determineShotDirection(
  currentFrame: EnhancedTrackingFrame,
  previousFrames: EnhancedTrackingFrame[]
): 'crosscourt' | 'down-the-line' | 'center' | 'unknown' {
  // Analyze ball trajectory to determine shot direction
  if (ballTrajectoryHistory.length < 3) return 'unknown';
  
  const recent = ballTrajectoryHistory.slice(-3);
  const trajectory = {
    x: recent[2].x - recent[0].x,
    y: recent[2].y - recent[0].y
  };
  
  const angle = Math.atan2(trajectory.y, trajectory.x) * (180 / Math.PI);
  
  if (Math.abs(angle) < 30) return 'center';
  if (Math.abs(angle) > 60) return 'crosscourt';
  return 'down-the-line';
}

/**
 * Enhanced initialization with court detection
 */
export async function initializeEnhancedTennisTracker(
  initialBoxes: EnhancedBoundingBox[],
  imageBase64: string,
  videoWidth: number,
  videoHeight: number
): Promise<{
  initialFrame: EnhancedTrackingFrame,
  courtBoundaries: CourtBoundaries
}> {
  // Detect court boundaries
  const courtBoundaries = await detectCourtBoundaries(imageBase64, videoWidth, videoHeight);
  
  // Find player and ball boxes
  const playerBox = initialBoxes.find(box => box.label === 'player');
  const ballBox = initialBoxes.find(box => box.label === 'ball');
  
  if (!playerBox || !ballBox) {
    throw new Error('Both player and ball bounding boxes are required');
  }
  
  // Create initial tracking frame
  const initialFrame: EnhancedTrackingFrame = {
    frameId: 0,
    timestamp: 0,
    player: {
      x: playerBox.x,
      y: playerBox.y,
      width: playerBox.width,
      height: playerBox.height,
      centerX: playerBox.x + playerBox.width / 2,
      centerY: playerBox.y + playerBox.height / 2,
      confidence: playerBox.confidence || 1.0
    },
    ball: {
      x: ballBox.x,
      y: ballBox.y,
      width: ballBox.width,
      height: ballBox.height,
      centerX: ballBox.x + ballBox.width / 2,
      centerY: ballBox.y + ballBox.height / 2,
      confidence: ballBox.confidence || 1.0
    },
    courtInfo: courtBoundaries,
    distancePlayerToBall: Math.sqrt(
      Math.pow((playerBox.x + playerBox.width / 2) - (ballBox.x + ballBox.width / 2), 2) +
      Math.pow((playerBox.y + playerBox.height / 2) - (ballBox.y + ballBox.height / 2), 2)
    ),
    playerSpeed: 0,
    ballSpeed: 0,
    playerDistanceCovered: 0,
    totalPlayerDistanceCovered: 0
  };
  
  return {
    initialFrame,
    courtBoundaries
  };
}

/**
 * Enhanced frame tracking with improved shot detection
 */
export async function trackFrameEnhanced(
  imageBase64: string,
  frameId: number,
  timestamp: number,
  previousFrames: EnhancedTrackingFrame[]
): Promise<EnhancedTrackingFrame> {
  try {
    const base64Data = imageBase64.split('base64,')[1];
    const previousFrame = previousFrames[previousFrames.length - 1];
    
    // Detect objects using Roboflow
    const [ballResponse, playerResponse] = await Promise.all([
      axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${TENNIS_MODELS.BALL_ONLY}?api_key=${ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }),
      axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${TENNIS_MODELS.PLAYER_BALL}?api_key=${ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    ]);
    
    // Process detections
    const ballDetections = ballResponse.data.predictions || [];
    const playerDetections = playerResponse.data.predictions?.filter((p: any) => p.class === 'player') || [];
    
    // Get best detections
    const bestBall = ballDetections
      .filter((b: any) => b.confidence > 0.5)
      .sort((a: any, b: any) => b.confidence - a.confidence)[0];
    
    const bestPlayer = playerDetections
      .sort((a: any, b: any) => b.confidence - a.confidence)[0];
    
    // Create tracking frame
    const currentFrame: EnhancedTrackingFrame = {
      frameId,
      timestamp,
      player: bestPlayer ? {
        x: bestPlayer.x - bestPlayer.width / 2,
        y: bestPlayer.y - bestPlayer.height / 2,
        width: bestPlayer.width,
        height: bestPlayer.height,
        centerX: bestPlayer.x,
        centerY: bestPlayer.y,
        confidence: bestPlayer.confidence
      } : previousFrame.player,
      ball: bestBall ? {
        x: bestBall.x - bestBall.width / 2,
        y: bestBall.y - bestBall.height / 2,
        width: bestBall.width,
        height: bestBall.height,
        centerX: bestBall.x,
        centerY: bestBall.y,
        confidence: bestBall.confidence
      } : previousFrame.ball,
      courtInfo: previousFrame.courtInfo,
      distancePlayerToBall: 0,
      playerSpeed: 0,
      ballSpeed: 0,
      playerDistanceCovered: 0,
      totalPlayerDistanceCovered: previousFrame.totalPlayerDistanceCovered
    };
    
    // Calculate distances and speeds
    if (currentFrame.player && currentFrame.ball) {
      currentFrame.distancePlayerToBall = Math.sqrt(
        Math.pow(currentFrame.player.centerX - currentFrame.ball.centerX, 2) +
        Math.pow(currentFrame.player.centerY - currentFrame.ball.centerY, 2)
      );
    }
    
    if (currentFrame.player && previousFrame.player) {
      const timeDiff = (timestamp - previousFrame.timestamp) / 1000;
      const distance = Math.sqrt(
        Math.pow(currentFrame.player.centerX - previousFrame.player.centerX, 2) +
        Math.pow(currentFrame.player.centerY - previousFrame.player.centerY, 2)
      );
      currentFrame.playerSpeed = (distance * previousFrame.courtInfo.pixelsToMeters / timeDiff) * 3.6; // km/h
      currentFrame.playerDistanceCovered = distance * previousFrame.courtInfo.pixelsToMeters;
      currentFrame.totalPlayerDistanceCovered += currentFrame.playerDistanceCovered;
    }
    
    if (currentFrame.ball && previousFrame.ball) {
      const timeDiff = (timestamp - previousFrame.timestamp) / 1000;
      const distance = Math.sqrt(
        Math.pow(currentFrame.ball.centerX - previousFrame.ball.centerX, 2) +
        Math.pow(currentFrame.ball.centerY - previousFrame.ball.centerY, 2)
      );
      currentFrame.ballSpeed = (distance * previousFrame.courtInfo.pixelsToMeters / timeDiff) * 3.6; // km/h
      
      // Update ball trajectory
      ballTrajectoryHistory.push({
        x: currentFrame.ball.centerX,
        y: currentFrame.ball.centerY,
        timestamp,
        speed: currentFrame.ballSpeed,
        confidence: currentFrame.ball.confidence
      });
      
      // Keep trajectory history manageable
      if (ballTrajectoryHistory.length > SHOT_DETECTION_CONFIG.TRAJECTORY_MEMORY) {
        ballTrajectoryHistory.shift();
      }
    }
    
    // Perform enhanced shot detection
    currentFrame.shotAnalysis = detectShotEnhanced(currentFrame, previousFrames);
    
    return currentFrame;
  } catch (error) {
    console.error('Error in enhanced frame tracking:', error);
    // Return previous frame with updated timestamp on error
    return {
      ...previousFrames[previousFrames.length - 1],
      frameId,
      timestamp
    };
  }
}