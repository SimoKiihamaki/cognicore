# Add Chat History Management to CogniCore

## Overview
This PR adds a comprehensive chat history management system to CogniCore, allowing users to save, organize, and browse their chat conversations. The feature provides a seamless way to revisit past interactions, continue conversations, and export/import chat histories.

## Features Added
- **Persistent Chat History**: Store conversations in IndexedDB with proper organization
- **Chat History Interface**: Browse, search, and manage saved conversations
- **Conversation Management**: Create, rename, star, and delete chat histories
- **Export/Import**: Share conversations with export/import functionality
- **Enhanced Chat UI**: Resizable panels with history sidebar
- **Mobile Support**: Responsive design for mobile devices

## Technical Implementation
- Added new `ChatHistory` type to the type system
- Created `chatHistoryService` to manage chat history data persistence
- Implemented `useChatHistory` React hook for component integration
- Added `ChatHistoryList` component for browsing conversations
- Enhanced `ChatInterface` to work with the history system
- Created `EnhancedChatInterface` with resizable panels
- Added database schema updates in `databaseService.ts`

## Screenshots
[Screenshots would go here in a real PR]

## Testing
- Verified chat history persistence across page reloads
- Tested export/import functionality with various chat histories
- Ensured proper handling of starred conversations
- Verified mobile responsiveness and usability
- Tested search functionality across conversation content

## Note to Reviewers
This PR introduces a new database store for chat histories. The database schema is automatically updated when the application starts, but if you encounter any issues, you may need to clear your browser data for the application and restart.
