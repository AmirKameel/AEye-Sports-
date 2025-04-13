import axios from 'axios';

// Constants for accurate tennis analysis
const FRAME_PROCESSING_RATE = 20; // Process 20 frames per second for accuracy
const MIN_CONFIDENCE = 0.85; // Higher confidence threshold for accurate detection
const COURT_WIDTH_METERS = 10.97; // Singles court width in meters
const COURT_LENGTH_METERS = 23.77; // Court length in meters

// Types for accurate tracking
interface PlayerStats {
  id: number;
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  heatmap: number[][];
  courtCoverage: number;
}

interface DetectedObject {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerData {
  id: number;
  position: { x: number; y: number };
  speed: number;
  distanceCovered: number;
  heatmap: number[][];
}

interface AccurateFrame {
  timestamp: number;
  players: PlayerData[];
  netPosition?: { x: number; y: number };
  courtScale: number; // Pixels to meters ratio based on net width
}

interface AccurateAnalysisResult {
  frames: AccurateFrame[];
  players: {
    [id: number]: PlayerStats;
  };
  duration: number;
  isAccurateMode?: boolean;
}

// Initialize tracking with court calibration using net detection
export async function initializeAccurateTracking(
  imageBase64: string,
  videoWidth: number,
  videoHeight: number
): Promise<{ courtScale: number; initialPlayers: PlayerData[] }> {
  try {
    console.log('Sending request to Roboflow API...');
    const response = await axios({
      method: 'POST',
      url: 'https://detect.roboflow.com/tennis-ball-and-court-detection-cmbhj/1',
      params: {
        api_key: process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY
      },
      data: imageBase64,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Roboflow API response:', response.data);
    const predictions = response.data.predictions;
    
    // Find net for court calibration
    const netDetection = predictions.find((pred: DetectedObject) => 
      pred.class === 'net' && pred.confidence > MIN_CONFIDENCE
    );

    console.log('Net detection:', netDetection);

    if (!netDetection) {
      throw new Error('Could not detect tennis net for court calibration');
    }

    // Calculate pixels to meters ratio using net width
    // Standard tennis net width is 10.06m for singles
    const courtScale = 10.06 / netDetection.width;
    console.log('Calculated court scale:', courtScale);

    // Initialize players
    const playerDetections = predictions
      .filter((pred: DetectedObject) => 
        pred.class === 'player' && pred.confidence > MIN_CONFIDENCE
      )
      .map((player: DetectedObject, index: number) => ({
        id: index + 1,
        position: {
          x: player.x + player.width / 2,
          y: player.y + player.height / 2
        },
        speed: 0,
        distanceCovered: 0,
        heatmap: Array(10).fill(0).map(() => Array(10).fill(0))
      }));

    console.log('Detected players:', playerDetections);

    return {
      courtScale,
      initialPlayers: playerDetections
    };
  } catch (error) {
    console.error('Error initializing accurate tracking:', error);
    throw error;
  }
}

// Process a frame with accurate player detection and tracking
export async function processAccurateFrame(
  imageBase64: string,
  timestamp: number,
  previousFrame: AccurateFrame,
  courtScale: number
): Promise<AccurateFrame> {
  try {    const response = await axios({
      method: 'POST',
      url: 'https://detect.roboflow.com/tennis-ball-and-court-detection-cmbhj/1',
      params: {
        api_key: process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY
      },
      data: imageBase64,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const predictions = response.data.predictions;

    // Track net position
    const netDetection = predictions.find((pred: DetectedObject) => 
      pred.class === 'net' && pred.confidence > MIN_CONFIDENCE
    );

    // Track players with advanced metrics
    const playerDetections = predictions
      .filter((pred: DetectedObject) => 
        pred.class === 'player' && pred.confidence > MIN_CONFIDENCE
      );

    // Map current players to previous players and calculate metrics
    const players = previousFrame.players.map(prevPlayer => {
      // Find closest detection to this previous player
      const closestDetection = findClosestPlayer(prevPlayer, playerDetections);
      
      if (closestDetection) {
        const newPosition = {
          x: closestDetection.x + closestDetection.width / 2,
          y: closestDetection.y + closestDetection.height / 2
        };

        // Calculate speed (in meters per second)
        const distance = calculateDistance(prevPlayer.position, newPosition) * courtScale;
        const timeDiff = timestamp - previousFrame.timestamp;
        const speed = distance / timeDiff;

        // Update heatmap
        const updatedHeatmap = updateHeatmap(prevPlayer.heatmap, newPosition);

        return {
          ...prevPlayer,
          position: newPosition,
          speed,
          distanceCovered: prevPlayer.distanceCovered + distance,
          heatmap: updatedHeatmap
        };
      }

      return prevPlayer;
    });

    // Add any new players that weren't matched
    playerDetections.forEach((detection: DetectedObject) => {
      if (!players.some(p => isNearby(p.position, {
        x: detection.x + detection.width / 2,
        y: detection.y + detection.height / 2
      }))) {
        players.push({
          id: players.length + 1,
          position: {
            x: detection.x + detection.width / 2,
            y: detection.y + detection.height / 2
          },
          speed: 0,
          distanceCovered: 0,
          heatmap: Array(10).fill(0).map(() => Array(10).fill(0))
        });
      }
    });

    return {
      timestamp,
      players,
      netPosition: netDetection ? {
        x: netDetection.x + netDetection.width / 2,
        y: netDetection.y + netDetection.height / 2
      } : undefined,
      courtScale
    };
  } catch (error) {
    console.error('Error processing frame:', error);
    throw error;
  }
}

// Generate final analysis results
export function generateAccurateAnalysis(frames: AccurateFrame[]): AccurateAnalysisResult {
  const players: { [id: number]: any } = {};

  // Initialize player stats
  frames[0].players.forEach(player => {
    players[player.id] = {
      id: player.id, // Add ID to match PlayerStats interface
      totalDistance: 0,
      speeds: [],
      heatmap: player.heatmap,
      positions: []
    };
  });

  // Process all frames
  frames.forEach(frame => {
    frame.players.forEach(player => {
      const stats = players[player.id];
      if (stats) {
        stats.totalDistance = player.distanceCovered;
        stats.speeds.push(player.speed);
        stats.heatmap = player.heatmap;
        stats.positions.push(player.position);
      }
    });
  });

  // Calculate final stats for each player
  const finalStats: { [key: number]: PlayerStats } = {};
  Object.entries(players).forEach(([id, stats]) => {
    finalStats[parseInt(id)] = {
      id: parseInt(id), // Include ID in final stats
      totalDistance: stats.totalDistance,
      averageSpeed: stats.speeds.reduce((a: number, b: number) => a + b, 0) / stats.speeds.length,
      maxSpeed: Math.max(...stats.speeds),
      heatmap: stats.heatmap,
      courtCoverage: calculateCourtCoverage(stats.positions)
    };
  });

  return {
    frames,
    players: finalStats,
    duration: frames[frames.length - 1].timestamp - frames[0].timestamp,
    isAccurateMode: true // Add flag to identify accurate mode
  };
}

// Helper functions
function findClosestPlayer(
  player: PlayerData,
  detections: DetectedObject[]
): DetectedObject | null {
  let closestDetection = null;
  let minDistance = Infinity;

  detections.forEach(detection => {
    const position = {
      x: detection.x + detection.width / 2,
      y: detection.y + detection.height / 2
    };
    
    const distance = calculateDistance(player.position, position);
    if (distance < minDistance) {
      minDistance = distance;
      closestDetection = detection;
    }
  });

  return closestDetection;
}

function calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  return Math.sqrt(
    Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
  );
}

function isNearby(pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean {
  return calculateDistance(pos1, pos2) < 50; // 50 pixels threshold
}

function updateHeatmap(heatmap: number[][], position: { x: number; y: number }): number[][] {
  const newHeatmap = heatmap.map(row => [...row]);
  const gridX = Math.min(9, Math.floor((position.x / 1920) * 10)); // Assuming 1920px width
  const gridY = Math.min(9, Math.floor((position.y / 1080) * 10)); // Assuming 1080px height
  newHeatmap[gridY][gridX]++;
  return newHeatmap;
}

function calculateCourtCoverage(positions: { x: number; y: number }[]): number {
  const gridSize = 10;
  const grid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(false));
  
  positions.forEach(pos => {
    const gridX = Math.min(gridSize - 1, Math.floor((pos.x / 1920) * gridSize));
    const gridY = Math.min(gridSize - 1, Math.floor((pos.y / 1080) * gridSize));
    grid[gridY][gridX] = true;
  });
  
  const coveredCells = grid.flat().filter(cell => cell).length;
  return (coveredCells / (gridSize * gridSize)) * 100;
}
