/**
 * Export service for saving notes, folders, and settings to files
 * Handles data export in various formats (JSON, Markdown, etc.)
 */

import { Note, Folder, IndexedFile } from '@/lib/types';
import { LMStudioConfig } from '@/api/lmStudioApi';

/**
 * Types of data that can be exported
 */
export enum ExportDataType {
  NOTES = 'notes',
  FOLDERS = 'folders',
  SETTINGS = 'settings',
  FILES = 'files',
  ALL = 'all'
}

/**
 * Export formats supported by the application
 */
export enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown', // For notes only
  CSV = 'csv' // For notes only
}

/**
 * Configuration for the export operation
 */
export interface ExportConfig {
  /** Types of data to export */
  dataTypes: ExportDataType[];
  /** Format for the export */
  format: ExportFormat;
  /** Whether to include embeddings in the export */
  includeEmbeddings?: boolean;
  /** Whether to split notes into separate files (for markdown) */
  splitFiles?: boolean;
  /** Optional filter to only export specific items */
  filter?: {
    folderIds?: string[];
    noteIds?: string[];
    fileIds?: string[];
  };
}

/**
 * Full application export including all data types
 */
export interface FullExport {
  notes: Note[];
  folders: Folder[];
  files: IndexedFile[];
  settings: {
    lmStudio?: LMStudioConfig;
    monitoredFolders?: string[];
    appearance?: any;
    [key: string]: any;
  };
  metadata: {
    exportDate: string;
    version: string;
    itemCounts: {
      notes: number;
      folders: number;
      files: number;
    };
  };
}

/**
 * Export data to a file
 * @param data Data to export (notes, folders, settings, etc.)
 * @param config Export configuration
 * @returns Blob containing the exported data
 */
export async function exportData(
  data: {
    notes?: Note[];
    folders?: Folder[];
    files?: IndexedFile[];
    settings?: Record<string, any>;
  },
  config: ExportConfig
): Promise<Blob> {
  // Prepare filtered data based on config
  const filteredData = filterDataForExport(data, config);
  
  // Export based on format
  switch (config.format) {
    case ExportFormat.JSON:
      return exportToJson(filteredData, config);
    case ExportFormat.MARKDOWN:
      if (filteredData.notes) {
        return exportToMarkdown(filteredData.notes, config);
      }
      throw new Error('Markdown export only supports notes');
    case ExportFormat.CSV:
      if (filteredData.notes) {
        return exportToCsv(filteredData.notes, config);
      }
      throw new Error('CSV export only supports notes');
    default:
      throw new Error(`Unsupported export format: ${config.format}`);
  }
}

/**
 * Filter data based on export configuration
 */
function filterDataForExport(
  data: {
    notes?: Note[];
    folders?: Folder[];
    files?: IndexedFile[];
    settings?: Record<string, any>;
  },
  config: ExportConfig
): {
  notes?: Note[];
  folders?: Folder[];
  files?: IndexedFile[];
  settings?: Record<string, any>;
} {
  const result: {
    notes?: Note[];
    folders?: Folder[];
    files?: IndexedFile[];
    settings?: Record<string, any>;
  } = {};
  
  // Filter notes
  if (data.notes && (
    config.dataTypes.includes(ExportDataType.NOTES) || 
    config.dataTypes.includes(ExportDataType.ALL)
  )) {
    let filteredNotes = [...data.notes];
    
    // Apply ID filter if specified
    if (config.filter?.noteIds) {
      filteredNotes = filteredNotes.filter(note => 
        config.filter?.noteIds?.includes(note.id)
      );
    }
    
    // Apply folder filter if specified
    if (config.filter?.folderIds) {
      filteredNotes = filteredNotes.filter(note => 
        config.filter?.folderIds?.includes(note.folderId)
      );
    }
    
    // Handle embeddings inclusion
    if (!config.includeEmbeddings) {
      filteredNotes = filteredNotes.map(note => {
        const { embeddings, ...noteWithoutEmbeddings } = note;
        return noteWithoutEmbeddings as Note;
      });
    }
    
    result.notes = filteredNotes;
  }
  
  // Filter folders
  if (data.folders && (
    config.dataTypes.includes(ExportDataType.FOLDERS) || 
    config.dataTypes.includes(ExportDataType.ALL)
  )) {
    let filteredFolders = [...data.folders];
    
    // Apply folder filter if specified
    if (config.filter?.folderIds) {
      filteredFolders = filteredFolders.filter(folder => 
        config.filter?.folderIds?.includes(folder.id)
      );
    }
    
    result.folders = filteredFolders;
  }
  
  // Filter files
  if (data.files && (
    config.dataTypes.includes(ExportDataType.FILES) || 
    config.dataTypes.includes(ExportDataType.ALL)
  )) {
    let filteredFiles = [...data.files];
    
    // Apply file filter if specified
    if (config.filter?.fileIds) {
      filteredFiles = filteredFiles.filter(file => 
        config.filter?.fileIds?.includes(file.id)
      );
    }
    
    // Handle embeddings inclusion
    if (!config.includeEmbeddings) {
      filteredFiles = filteredFiles.map(file => {
        const { embeddings, ...fileWithoutEmbeddings } = file;
        return fileWithoutEmbeddings as IndexedFile;
      });
    }
    
    result.files = filteredFiles;
  }
  
  // Include settings
  if (data.settings && (
    config.dataTypes.includes(ExportDataType.SETTINGS) || 
    config.dataTypes.includes(ExportDataType.ALL)
  )) {
    result.settings = { ...data.settings };
  }
  
  return result;
}

/**
 * Export data to JSON format
 */
async function exportToJson(
  data: {
    notes?: Note[];
    folders?: Folder[];
    files?: IndexedFile[];
    settings?: Record<string, any>;
  },
  config: ExportConfig
): Promise<Blob> {
  // Create a full export object with metadata
  const exportObject: FullExport = {
    notes: data.notes || [],
    folders: data.folders || [],
    files: data.files || [],
    settings: data.settings || {},
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0.0', // App version
      itemCounts: {
        notes: data.notes?.length || 0,
        folders: data.folders?.length || 0,
        files: data.files?.length || 0
      }
    }
  };
  
  // Convert to JSON string with pretty formatting
  const jsonString = JSON.stringify(exportObject, null, 2);
  
  // Create blob with proper MIME type
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Export notes to Markdown format
 */
async function exportToMarkdown(
  notes: Note[],
  config: ExportConfig
): Promise<Blob> {
  if (config.splitFiles) {
    // Create a zip file with individual markdown files
    const JSZip = await import('jszip').then(module => module.default);
    const zip = new JSZip();
    
    // Add each note as a separate markdown file
    notes.forEach(note => {
      const fileName = `${sanitizeFileName(note.title)}.md`;
      const content = formatNoteAsMarkdown(note);
      zip.file(fileName, content);
    });
    
    // Generate the zip file
    return await zip.generateAsync({ type: 'blob' });
  } else {
    // Create one markdown file with all notes
    let markdownContent = '';
    
    notes.forEach(note => {
      markdownContent += formatNoteAsMarkdown(note);
      markdownContent += '\n\n---\n\n'; // Separator between notes
    });
    
    return new Blob([markdownContent], { type: 'text/markdown' });
  }
}

/**
 * Format a note as a markdown document
 */
function formatNoteAsMarkdown(note: Note): string {
  let markdown = `# ${note.title}\n\n`;
  
  // Add metadata as YAML frontmatter
  markdown += '---\n';
  markdown += `id: ${note.id}\n`;
  markdown += `created: ${note.createdAt.toISOString()}\n`;
  markdown += `updated: ${note.updatedAt.toISOString()}\n`;
  if (note.folderId) {
    markdown += `folder: ${note.folderId}\n`;
  }
  if (note.tags && note.tags.length > 0) {
    markdown += `tags: [${note.tags.join(', ')}]\n`;
  }
  markdown += '---\n\n';
  
  // Add the note content
  markdown += note.content || '';
  
  return markdown;
}

/**
 * Export notes to CSV format
 */
async function exportToCsv(
  notes: Note[],
  config: ExportConfig
): Promise<Blob> {
  // CSV Headers
  const headers = ['id', 'title', 'content', 'folderId', 'createdAt', 'updatedAt', 'tags'];
  
  // Add embeddings header if included
  if (config.includeEmbeddings) {
    headers.push('embeddings');
  }
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add each note as a row
  notes.forEach(note => {
    const row = [
      quote(note.id),
      quote(note.title),
      quote(note.content || ''),
      quote(note.folderId),
      quote(note.createdAt.toISOString()),
      quote(note.updatedAt.toISOString()),
      quote(note.tags ? note.tags.join(';') : '')
    ];
    
    // Add embeddings if included
    if (config.includeEmbeddings && note.embeddings) {
      row.push(quote(JSON.stringify(note.embeddings)));
    }
    
    csvContent += row.join(',') + '\n';
  });
  
  return new Blob([csvContent], { type: 'text/csv' });
}

/**
 * Quote and escape a CSV field
 */
function quote(value: any): string {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid characters with dashes
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .trim();
}

/**
 * Trigger a file download in the browser
 * @param blob Blob to download
 * @param filename Suggested filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create and download a full data export
 * @param data Application data to export
 * @param format Export format
 * @param includeEmbeddings Whether to include embeddings
 */
export async function createFullExport(
  data: {
    notes: Note[];
    folders: Folder[];
    files: IndexedFile[];
    settings: Record<string, any>;
  },
  format: ExportFormat = ExportFormat.JSON,
  includeEmbeddings: boolean = false
): Promise<void> {
  const config: ExportConfig = {
    dataTypes: [ExportDataType.ALL],
    format,
    includeEmbeddings
  };
  
  const blob = await exportData(data, config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let filename = `cognicore_export_${timestamp}`;
  
  switch (format) {
    case ExportFormat.JSON:
      filename += '.json';
      break;
    case ExportFormat.MARKDOWN:
      filename += '.md';
      break;
    case ExportFormat.CSV:
      filename += '.csv';
      break;
  }
  
  downloadBlob(blob, filename);
}
