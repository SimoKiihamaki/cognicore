
/**
 * Utility functions for handling files 
 */

/**
 * Extract text content from a file
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type || getFileTypeFromName(file.name);
  
  try {
    // Text-based files
    if (isTextFile(fileType)) {
      return await file.text();
    }
    
    // For binary files, we would need specialized parsers
    // This is a placeholder for future implementation
    return `[Binary content from ${file.name}]`;
  } catch (error) {
    console.error(`Error extracting text from ${file.name}:`, error);
    return '';
  }
}

/**
 * Determine file type from file name
 */
function getFileTypeFromName(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'html': 'text/html',
    'htm': 'text/html',
    'json': 'application/json',
    'csv': 'text/csv',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'jsx': 'text/javascript',
    'tsx': 'text/typescript',
    'css': 'text/css',
    'scss': 'text/scss'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Check if a file is a text file based on its MIME type
 */
function isTextFile(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/typescript' ||
    mimeType === 'application/xml'
  );
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a temporary URL for a file
 */
export function createFileURL(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up a file URL
 */
export function revokeFileURL(url: string): void {
  URL.revokeObjectURL(url);
}
