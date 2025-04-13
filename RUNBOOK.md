# AEye Sports Analysis Platform Runbook

## Overview

AEye Sports is an AI-powered sports analysis platform that provides advanced video analysis for tennis and football. This runbook provides detailed information for developers to understand and extend the platform's functionality.

## Core Features

### Tennis Analysis

1. **Quick Analysis Mode**
   - Lightweight processing for basic performance metrics
   - Uses player and ball tracking with basic detection
   - Provides essential metrics like player position and movement
   - Processing time: ~2-3 minutes for a 5-minute video

2. **Accurate Analysis Mode**
   - Advanced multi-player tracking system
   - High-precision court calibration using net detection
   - Detailed metrics including:
     - Player speed and distance covered
     - Court coverage heatmaps
     - Player positioning analysis
   - Processing time: ~5-7 minutes for a 5-minute video

3. **Tennis Video Analysis Tool**
   - Frame-by-frame analysis capability
   - Custom analysis prompts
   - Shot counting and classification
   - Player movement tracking
   - Ball trajectory analysis

### Football Analysis

1. **Formation Analysis**
   - Team formation detection
   - Player positioning patterns
   - Tactical movement analysis

2. **Performance Analysis**
   - Player speed and distance tracking
   - Heat maps and movement patterns
   - Team statistics and metrics

3. **Profile Generation**
   - Automated player profile creation
   - Performance statistics compilation
   - Achievement tracking

## Technical Architecture

### Core Components

1. **Frontend (Next.js + TypeScript)**
   - `/app` - Next.js app router pages and layouts
   - `/components` - Reusable React components
   - `/lib` - Utility functions and API clients

2. **AI Services Integration**
   - Roboflow API for object detection
   - OpenAI/GPT for analysis generation
   - Gemini for advanced tennis analysis

3. **Backend Services**
   - Supabase for database and storage
   - Next.js API routes for server-side processing

### Key Files and Their Purposes

1. **Tennis Analysis**
   - `tennis-tracker-accurate.ts`: Advanced tennis tracking implementation
   - `tennis-tracker-advanced.ts`: Enhanced tracking with Gemini integration
   - `tennis-tracker.ts`: Basic tennis tracking functionality

2. **Football Analysis**
   - `movement-analyzer.ts`: Player movement analysis
   - `formation-analyzer.ts`: Team formation detection

3. **Video Processing**
   - `video-processor.ts`: Core video processing logic
   - `VideoAnalyzer.tsx`: Video analysis UI component

## Implementation Guide

### Setting Up Tennis Analysis

1. **Quick Analysis Mode Implementation**
   ```typescript
   // Key parameters
   const FRAME_RATE = 2; // Process 2 frames per second
   const MIN_CONFIDENCE = 0.85; // Detection confidence threshold
   ```

2. **Accurate Analysis Mode Implementation**
   ```typescript
   // Required parameters
   const COURT_WIDTH_METERS = 10.97; // Singles court width
   const COURT_LENGTH_METERS = 23.77; // Court length
   ```

### API Integration

1. **Roboflow API Setup**
   - Endpoint: `https://detect.roboflow.com/[MODEL]/[VERSION]`
   - Required Headers:
     - Content-Type: 'application/x-www-form-urlencoded'
     - API Key in params

2. **Analysis API Routes**
   - POST `/api/analyze`: Start video analysis
   - GET `/api/analysis/[id]`: Fetch analysis results

## Development Workflow

1. **Adding New Features**
   - Create feature branch from main
   - Implement changes following TypeScript conventions
   - Add necessary tests
   - Update relevant documentation

2. **Testing Requirements**
   - Unit tests for utility functions
   - Integration tests for API routes
   - End-to-end tests for critical user flows

3. **Performance Considerations**
   - Optimize frame processing rate
   - Implement caching for analysis results
   - Use efficient data structures for real-time tracking

## Error Handling

1. **Common Error Scenarios**
   - Video loading failures
   - API rate limiting
   - Object detection failures
   - Analysis generation errors

2. **Error Recovery Strategies**
   - Implement retry mechanisms for API calls
   - Cache partial results during processing
   - Provide fallback analysis modes

## Deployment Guidelines

1. **Environment Setup**
   - Required environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_ROBOFLOW_API_KEY`

2. **Production Considerations**
   - Set up proper error monitoring
   - Configure appropriate API rate limits
   - Implement proper caching strategies
   - Use production-grade video processing queue

## Performance Optimization

1. **Video Processing**
   - Implement worker service for long-running tasks
   - Use AWS SQS or similar for queue management
   - Optimize frame extraction and processing

2. **Analysis Generation**
   - Cache analysis results
   - Implement progressive loading
   - Optimize API calls

## Monitoring and Maintenance

1. **Key Metrics to Monitor**
   - API response times
   - Video processing duration
   - Error rates
   - Storage usage

2. **Regular Maintenance Tasks**
   - Clean up temporary files
   - Update AI models
   - Monitor API usage
   - Database optimization

## Security Considerations

1. **API Security**
   - Implement proper authentication
   - Secure API keys
   - Rate limiting
   - Input validation

2. **Data Protection**
   - Implement proper data retention policies
   - Secure video storage
   - User data protection

## Future Development Areas

1. **Planned Enhancements**
   - Real-time analysis capabilities
   - Additional sports support
   - Enhanced AI model training
   - Mobile app development

2. **Integration Opportunities**
   - Live streaming support
   - Additional AI model integration
   - Social sharing features
   - Team collaboration tools

## Support and Troubleshooting

1. **Common Issues**
   - Video format compatibility
   - Processing timeout handling
   - API integration errors
   - Storage limitations

2. **Resolution Steps**
   - Detailed error logging
   - Fallback mechanisms
   - User feedback collection
   - Performance monitoring

## Documentation Updates

Maintain this runbook by:
- Adding new features as implemented
- Updating API changes
- Documenting bug fixes
- Adding new troubleshooting steps
