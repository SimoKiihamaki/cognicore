
/**
 * Utility functions for file handling
 */

/**
 * Extract text content from various file types
 * 
 * @param file The file to extract text from
 * @returns Promise containing the extracted text
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    // Handle different file types differently
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Text-based files
    if (
      extension === 'txt' || 
      extension === 'md' || 
      extension === 'markdown' ||
      extension === 'js' || 
      extension === 'ts' || 
      extension === 'jsx' || 
      extension === 'tsx' ||
      extension === 'css' || 
      extension === 'scss' ||
      extension === 'html' || 
      extension === 'htm'
    ) {
      return await file.text();
    }
    
    // JSON files
    if (extension === 'json') {
      const text = await file.text();
      try {
        // Try to parse and re-stringify for consistent formatting
        const obj = JSON.parse(text);
        return JSON.stringify(obj, null, 2);
      } catch {
        // If parsing fails, return as regular text
        return text;
      }
    }
    
    // CSV files - return raw content for now
    if (extension === 'csv') {
      return await file.text();
    }
    
    // For unsupported types, return an empty string
    return '';
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

/**
 * Get MIME type from file extension
 * 
 * @param filename The filename to determine MIME type from
 * @returns The MIME type string
 */
export function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // Common MIME types
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    csv: 'text/csv',
    js: 'application/javascript',
    ts: 'application/typescript',
    jsx: 'application/javascript',
    tsx: 'application/typescript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  };
  
  return extension && mimeTypes[extension] ? mimeTypes[extension] : 'application/octet-stream';
}
