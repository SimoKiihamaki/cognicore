# Changelog

## [Unreleased] - Enhanced Embedding System and Chat Features

### Added
- Vision capabilities for multimodal models in LM Studio
- New Vision Chat interface for image-based conversations
- Support for base64-encoded images in LM Studio API
- Automated vision model detection
- Improved vector operations in the embedding system
- Enhanced text chunking with better overlap handling
- Added centroid calculation for multiple embeddings
- Advanced similarity search capabilities
- Dynamic model selection for embeddings
- Better error handling and recovery mechanisms
- Persistent chat history management
- Chat history export and import functionality
- Ability to save, organize, and star conversations
- Searchable chat history interface

### Changed
- Updated ServiceLocator to load embedding model from settings
- Enhanced embedding service with progress reporting
- Improved embedding worker with queue management
- Added embedding functionality testing to the TestComponent

### Fixed
- Properly handle worker communication edge cases
- Ensured proper cleanup of workers on application unmount
- Improved error handling in vector similarity calculations
- Fixed initialization issues with embedding service

## [1.0.0] - Initial Release

- Core functionality implemented
- React-based UI with ShadCN components
- Integration with LM Studio
- File system access with fallbacks
- IndexedDB-based data persistence
- Knowledge graph visualization
