# Add Vision Capabilities to CogniCore

## Overview
This PR adds support for multimodal vision capabilities to CogniCore by extending the LM Studio integration. Users can now upload images along with their text prompts in a dedicated Vision Chat interface, leveraging the vision capabilities of multimodal models like Gemma 3, LLaVA, or Claude 3 through LM Studio.

## Changes
- **Enhanced LM Studio API:** Added support for multimodal messages with text and base64-encoded images
- **Vision Model Detection:** Implemented automatic detection of vision-capable models
- **Vision Chat Component:** Created a dedicated interface for image-based conversations
- **Image Upload:** Added support for selecting and previewing images before sending
- **Navigation:** Added Vision Chat to the sidebar menu and routes

## Technical Details
- Extended the LM Studio API service to format multimodal messages according to the OpenAI-compatible format
- Implemented utility methods for image-to-base64 conversion
- Added detection of vision-capable models based on model name patterns
- Created a dedicated route for the Vision Chat interface
- Added image preview and management in the chat input component

## Testing
The vision capabilities can be tested by:
1. Running LM Studio with a multimodal model that supports vision (e.g., Gemma 3, LLaVA)
2. Configuring the LM Studio connection in the settings
3. Navigating to the Vision Chat interface
4. Uploading images and asking questions about them

## Implementation Notes
- Vision capabilities require a model that supports multimodal inputs
- The feature follows the format described in the LM Studio documentation for sending images
- Image data is sent directly in the request as base64-encoded data URLs
- Large images are displayed as thumbnails but sent at full resolution (consider adding resizing in a future update)
