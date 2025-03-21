// This script adds sample data to localStorage
// Run this in the browser console

// Create sample notes
const sampleNotes = [
  {
    id: "note-sample1",
    title: "Welcome to CogniCore",
    content: "# Welcome to CogniCore\n\nThis is your first note. You can edit it or create new ones.",
    folderId: "folder-root",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "note-sample2",
    title: "Getting Started",
    content: "# Getting Started\n\n1. Create folders to organize your notes\n2. Connect to LM Studio for AI-powered features",
    folderId: "folder-root",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Store in localStorage
localStorage.setItem('cognicore-notes', JSON.stringify(sampleNotes));

// Also ensure we have the right folder structure
const folders = [
  {
    id: "folder-root",
    name: "My Notes",
    parentId: null,
    expanded: true,
    children: [
      {
        id: "work",
        name: "Work",
        parentId: "folder-root",
        expanded: true,
        children: [],
      },
      {
        id: "personal",
        name: "Personal",
        parentId: "folder-root",
        expanded: true,
        children: [],
      }
    ],
  }
];

localStorage.setItem('folders', JSON.stringify(folders));

console.log('Sample notes and folders added to localStorage');
