# CogniCore

CogniCore is a lightweight, privacy-focused note-taking and knowledge management application that runs entirely in the browser. It leverages client-side storage and processing to provide an AI-powered note organization and querying experience, while ensuring all data remains local to the user's machine.

## Features

- 🔒 **Privacy-First Design**: All data stays on your machine - no remote servers or cloud dependencies
- 🧠 **AI-Powered Insights**: Connect with locally-hosted LLMs via LM Studio for advanced text and image interactions
- 📊 **Automatic Knowledge Graph**: Visualize relationships between notes using sentence embeddings and cosine similarity
- ✍️ **Rich Text Editing**: Create and edit notes with a fully-featured Markdown editor
- 📁 **File System Integration**: Automatically monitor folders for changes and integrate new content
- 🔍 **Semantic Search**: Find relevant notes based on meaning, not just keywords
- 🌐 **MCP Server Integration**: Optional connection to Knowledge Model Control Protocol servers for extended capabilities
- 📱 **Offline Support**: Full functionality even without network connectivity
- 💾 **Import/Export**: Easily backup and transfer your knowledge base
- 🚀 **Optimized Performance**: Web workers and advanced caching for smooth operation even with large datasets

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- [LM Studio](https://lmstudio.ai/) (for local AI model integration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cognicore.git
   cd cognicore
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview the production build:
   ```bash
   npm run preview
   ```

## Usage

### Initial Setup

1. On first launch, you'll be prompted to configure LM Studio connection details
2. Set up folders to monitor for automatic content integration
3. Configure embedding model preferences for similarity detection

### Core Workflows

- **Note Creation**: Create notes directly in the editor or import from your filesystem
- **Knowledge Exploration**: Use the graph visualization to discover connections between your notes
- **AI Assistance**: Ask questions about your notes using the chat interface, which incorporates relevant context
- **Content Organization**: Get automatic suggestions for organizing notes into folders based on content similarity

## Architecture

CogniCore is built with a modern frontend stack:

- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **IndexedDB** and **LocalStorage** for client-side data persistence
- **Web Workers** for background processing of computationally intensive tasks
- **@xenova/transformers** for in-browser embedding generation
- **Cytoscape.js** for interactive graph visualization
- **TipTap** for the rich text editor
- **ShadCN UI** and **TailwindCSS** for the modern, dark-themed interface

## Privacy and Security

Privacy is a core principle of CogniCore:

- **Local-First**: All data is stored in your browser's IndexedDB and LocalStorage
- **No Tracking**: No analytics, tracking, or telemetry of any kind
- **No Remote Servers**: Does not depend on any cloud services (except optional MCP connections)
- **Transparent Code**: Open source and auditable

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ShadCN UI for the component library
- TipTap for the rich text editor
- Cytoscape.js for graph visualization
- Xenova for the transformers.js library enabling in-browser embeddings
- LM Studio for local LLM integration
