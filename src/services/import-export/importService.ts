/**
 * Import service for loading notes, folders, and settings from exported files
 * Handles parsing of various formats (JSON, Markdown, etc.)
 */

import { Note, Folder, IndexedFile } from '@/lib/types';
import { LMStudioConfig } from '@/api/lmStudioApi';
import { ExportFormat, FullExport } from './exportService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Options for the import process
 */
export interface ImportOptions {
  /** Whether to merge with existing data or replace it */
  mergeStrategy: 'merge' | 'replace';
  /** Whether to preserve original IDs or generate new ones */
  preserveIds: boolean;
  /** What to do with duplicates - identified by title/filename */
  duplicateStrategy: 'skip' | 'rename' | 'overwrite';
  /** Types of data to import */
  dataTypes: ('notes' | 'folders' | 'files' | 'settings')[];
  /** Whether to import embeddings when available */
  includeEmbeddings: boolean;
}

/**
 * Result of the import operation
 */
export interface ImportResult {
  success: boolean;
  importedItems: {
    notes: number;
    folders: number;
    files: number;
    settings: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Import data from a file
 * @param file File to import from
 * @param options Import options
 * @returns Promise with import results
 */
export async function importFromFile(
  file: File,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    // Determine the format based on file extension
    const format = getFormatFromFile(file);
    
    // Parse file content based on format
    let parsedData: Partial<FullExport>;
    
    switch (format) {
      case ExportFormat.JSON:
        parsedData = await parseJsonFile(file);
        break;
      case ExportFormat.MARKDOWN:
        parsedData = await parseMarkdownFile(file);
        break;
      case ExportFormat.CSV:
        parsedData = await parseCsvFile(file);
        break;
      default:
        return {
          success: false,
          importedItems: { notes: 0, folders: 0, files: 0, settings: false },
          errors: [`Unsupported file format: ${file.name}`],
          warnings: []
        };
    }
    
    // Process the parsed data based on import options
    return processImportedData(parsedData, options);
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      importedItems: { notes: 0, folders: 0, files: 0, settings: false },
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: []
    };
  }
}

/**
 * Determine file format from extension
 */
function getFormatFromFile(file: File): ExportFormat {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'json':
      return ExportFormat.JSON;
    case 'md':
    case 'markdown':
      return ExportFormat.MARKDOWN;
    case 'csv':
      return ExportFormat.CSV;
    default:
      // Try to infer from content type
      if (file.type === 'application/json') {
        return ExportFormat.JSON;
      } else if (file.type === 'text/markdown') {
        return ExportFormat.MARKDOWN;
      } else if (file.type === 'text/csv') {
        return ExportFormat.CSV;
      }
      
      throw new Error(`Unsupported file format: ${file.name}`);
  }
}

/**
 * Parse a JSON export file
 */
async function parseJsonFile(file: File): Promise<Partial<FullExport>> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate the JSON structure
    validateJsonStructure(data);
    
    // Convert date strings to Date objects
    return normalizeExportData(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate that the JSON data has the expected structure
 */
function validateJsonStructure(data: any): void {
  // Check if the data has at least one of the expected properties
  const hasExpectedProperties = 
    Array.isArray(data.notes) ||
    Array.isArray(data.folders) ||
    Array.isArray(data.files) ||
    typeof data.settings === 'object';
  
  if (!hasExpectedProperties) {
    throw new Error('Invalid export format: missing required data');
  }
  
  // If notes exist, validate their basic structure
  if (Array.isArray(data.notes)) {
    for (const note of data.notes) {
      if (typeof note !== 'object' || 
          typeof note.id !== 'string' || 
          typeof note.title !== 'string') {
        throw new Error('Invalid note format in export');
      }
    }
  }
  
  // If folders exist, validate their basic structure
  if (Array.isArray(data.folders)) {
    for (const folder of data.folders) {
      if (typeof folder !== 'object' || 
          typeof folder.id !== 'string' || 
          typeof folder.name !== 'string') {
        throw new Error('Invalid folder format in export');
      }
    }
  }
}

/**
 * Convert string dates back to Date objects and normalize data
 */
function normalizeExportData(data: any): Partial<FullExport> {
  const result: Partial<FullExport> = {};
  
  // Process notes
  if (Array.isArray(data.notes)) {
    result.notes = data.notes.map((note: any) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt)
    }));
  }
  
  // Process folders
  if (Array.isArray(data.folders)) {
    result.folders = data.folders.map((folder: any) => ({
      ...folder,
      createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date()
    }));
  }
  
  // Process files
  if (Array.isArray(data.files)) {
    result.files = data.files.map((file: any) => ({
      ...file,
      lastModified: new Date(file.lastModified)
    }));
  }
  
  // Process settings
  if (data.settings) {
    result.settings = data.settings;
  }
  
  // Include metadata if available
  if (data.metadata) {
    result.metadata = data.metadata;
  }
  
  return result;
}

/**
 * Parse a Markdown export file (single or multiple notes)
 */
async function parseMarkdownFile(file: File): Promise<Partial<FullExport>> {
  const text = await file.text();
  const notes: Note[] = [];
  
  // Check if it's a zip file containing multiple markdown files
  if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
    const JSZip = await import('jszip').then(module => module.default);
    const zip = await JSZip.loadAsync(file);
    
    // Process each markdown file in the zip
    const promises = Object.keys(zip.files)
      .filter(name => name.endsWith('.md'))
      .map(async name => {
        const content = await zip.files[name].async('string');
        const parsedNote = parseMarkdownNote(content, name.replace('.md', ''));
        if (parsedNote) {
          notes.push(parsedNote);
        }
      });
    
    await Promise.all(promises);
  } else {
    // Process a single markdown file with potentially multiple notes
    const sections = text.split(/\n\s*---\s*\n/)
      .filter(section => section.trim().length > 0);
    
    for (const section of sections) {
      const parsedNote = parseMarkdownNote(section);
      if (parsedNote) {
        notes.push(parsedNote);
      }
    }
  }
  
  return { notes };
}

/**
 * Parse a single markdown note section
 */
function parseMarkdownNote(content: string, defaultTitle?: string): Note | null {
  try {
    // Extract title from markdown heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : defaultTitle || 'Imported Note';
    
    // Check for YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let metadata: Record<string, any> = {};
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      
      // Parse YAML frontmatter
      frontmatter.split('\n').forEach(line => {
        const keyValue = line.split(':');
        if (keyValue.length >= 2) {
          const key = keyValue[0].trim();
          const value = keyValue.slice(1).join(':').trim();
          
          if (key && value) {
            if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
              metadata[key] = value.slice(1, -1).split(',').map(t => t.trim());
            } else {
              metadata[key] = value;
            }
          }
        }
      });
      
      // Remove frontmatter from content
      content = content.replace(frontmatterMatch[0], '');
    }
    
    // Remove the title heading from content
    if (titleMatch) {
      content = content.replace(titleMatch[0], '');
    }
    
    // Create the note object
    const note: Note = {
      id: metadata.id || uuidv4(),
      title,
      content: content.trim(),
      folderId: metadata.folder || '',
      createdAt: metadata.created ? new Date(metadata.created) : new Date(),
      updatedAt: metadata.updated ? new Date(metadata.updated) : new Date(),
      tags: metadata.tags || []
    };
    
    return note;
  } catch (error) {
    console.error('Error parsing markdown note:', error);
    return null;
  }
}

/**
 * Parse a CSV export file (notes only)
 */
async function parseCsvFile(file: File): Promise<Partial<FullExport>> {
  const text = await file.text();
  const notes: Note[] = [];
  
  // Split into lines and parse header
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file does not contain enough data');
  }
  
  // Parse header row
  const headers = parseCSVRow(lines[0]);
  
  // Map column indices to fields
  const fieldIndices: Record<string, number> = {};
  const requiredFields = ['id', 'title', 'content'];
  
  headers.forEach((header, index) => {
    fieldIndices[header.toLowerCase()] = index;
  });
  
  // Check if required fields are present
  for (const field of requiredFields) {
    if (fieldIndices[field] === undefined) {
      throw new Error(`CSV is missing required field: ${field}`);
    }
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i]);
    
    if (values.length < headers.length) {
      continue; // Skip malformed rows
    }
    
    try {
      const note: Note = {
        id: values[fieldIndices.id] || uuidv4(),
        title: values[fieldIndices.title] || 'Untitled',
        content: values[fieldIndices.content] || '',
        folderId: values[fieldIndices.folderid] || '',
        createdAt: fieldIndices.createdat !== undefined 
          ? new Date(values[fieldIndices.createdat]) 
          : new Date(),
        updatedAt: fieldIndices.updatedat !== undefined 
          ? new Date(values[fieldIndices.updatedat]) 
          : new Date(),
        tags: fieldIndices.tags !== undefined
          ? values[fieldIndices.tags].split(';').map(t => t.trim()).filter(Boolean)
          : []
      };
      
      // Process embeddings if present
      if (fieldIndices.embeddings !== undefined && values[fieldIndices.embeddings]) {
        try {
          note.embeddings = JSON.parse(values[fieldIndices.embeddings]);
        } catch {
          // Ignore invalid embeddings
        }
      }
      
      notes.push(note);
    } catch (error) {
      console.error(`Error parsing CSV row ${i}:`, error);
      // Continue with other rows
    }
  }
  
  return { notes };
}

/**
 * Parse a single CSV row, handling quoted fields correctly
 */
function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quotes inside a quoted field are escaped
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add the last field
  fields.push(currentField);
  
  return fields;
}

/**
 * Process the parsed data according to import options
 */
function processImportedData(
  data: Partial<FullExport>,
  options: ImportOptions
): ImportResult {
  const result: ImportResult = {
    success: true,
    importedItems: {
      notes: 0,
      folders: 0,
      files: 0,
      settings: false
    },
    errors: [],
    warnings: []
  };
  
  // Process each data type based on options
  if (data.notes && options.dataTypes.includes('notes')) {
    result.importedItems.notes = data.notes.length;
    
    // Apply import options to notes
    if (!options.preserveIds) {
      data.notes.forEach(note => {
        note.id = uuidv4();
      });
    }
    
    // Handle embeddings based on options
    if (!options.includeEmbeddings) {
      data.notes.forEach(note => {
        delete note.embeddings;
      });
    }
  } else {
    delete data.notes;
  }
  
  if (data.folders && options.dataTypes.includes('folders')) {
    result.importedItems.folders = data.folders.length;
    
    // Apply import options to folders
    if (!options.preserveIds) {
      data.folders.forEach(folder => {
        const oldId = folder.id;
        folder.id = uuidv4();
        
        // Update note references if we have notes
        if (data.notes) {
          data.notes.forEach(note => {
            if (note.folderId === oldId) {
              note.folderId = folder.id;
            }
          });
        }
      });
    }
  } else {
    delete data.folders;
  }
  
  if (data.files && options.dataTypes.includes('files')) {
    result.importedItems.files = data.files.length;
    
    // Apply import options to files
    if (!options.preserveIds) {
      data.files.forEach(file => {
        file.id = uuidv4();
      });
    }
    
    // Handle embeddings based on options
    if (!options.includeEmbeddings) {
      data.files.forEach(file => {
        delete file.embeddings;
      });
    }
  } else {
    delete data.files;
  }
  
  if (data.settings && options.dataTypes.includes('settings')) {
    result.importedItems.settings = true;
  } else {
    delete data.settings;
  }
  
  return {
    ...result,
    // The actual import of this processed data would happen in the hook
    // that calls this function, since it needs access to application state
  };
}

/**
 * Apply imported data to the application
 * This function would be called by a hook with access to app state
 */
export interface ImportApplicationResult extends ImportResult {
  data: Partial<FullExport>;
}

/**
 * Read multiple files for import
 * Handles .zip files containing multiple files
 */
export async function readFilesForImport(files: FileList): Promise<File[]> {
  const result: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.name.endsWith('.zip')) {
      try {
        const JSZip = await import('jszip').then(module => module.default);
        const zip = await JSZip.loadAsync(file);
        
        // Extract files from the zip
        const promises = Object.keys(zip.files)
          .filter(name => !zip.files[name].dir)
          .map(async name => {
            const content = await zip.files[name].async('blob');
            const extractedFile = new File([content], name, { 
              type: getTypeFromExtension(name) 
            });
            result.push(extractedFile);
          });
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Error processing zip file:', error);
        // Add the original zip file as a fallback
        result.push(file);
      }
    } else {
      result.push(file);
    }
  }
  
  return result;
}

/**
 * Get MIME type from file extension
 */
function getTypeFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'json': return 'application/json';
    case 'md': return 'text/markdown';
    case 'csv': return 'text/csv';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}
