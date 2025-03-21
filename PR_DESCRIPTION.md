# Enhanced Embedding System

## Overview
This PR enhances the embedding system in CogniCore, providing better vector operations, improved text chunking, and more robust worker-based processing. These improvements enable more accurate semantic search, better knowledge graph connectivity, and improved performance.

## Changes
- **Enhanced Vector Operations**: Improved cosine similarity calculations and added centroid calculation for multiple embeddings
- **Better Text Chunking**: Enhanced the text chunking algorithm to handle overlaps more effectively
- **Worker-Based Processing**: Implemented a robust worker communication system with proper queuing and error recovery
- **Dynamic Model Selection**: Added the ability to select different embedding models from application settings
- **Improved Embedding Service**: Enhanced the embedding service with better error handling and progress reporting
- **Testing Component**: Added embedding testing functionality to the diagnostic component

## Testing
The embedding system can be tested through the new functionality added to the TestComponent, which provides:
- Embedding generation and similarity testing
- Text chunking visualization
- Performance metrics for embedding operations

## Technical Details
- Improved the worker initialization process to handle model loading more gracefully
- Enhanced the ServiceLocator to properly initialize the embedding service with the configured model
- Added proper cleanup of embedding workers when the application is unmounted
- Implemented a more robust vector normalization and similarity calculation
