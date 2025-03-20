
import { Note, Folder, IndexedFile } from '@/lib/types';
import { ExportPackage } from './types';

/**
 * Export data as a JSON blob
 */
export function exportData(
  notes: Note[],
  files: IndexedFile[],
  folders: Folder[],
  settings: Record<string, any>,
  metadata: Record<string, any> = {}
): string {
  // Create export package
  const exportPackage: ExportPackage = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    metadata: {
      noteCount: notes.length,
      folderCount: folders.length,
      fileCount: files.length,
      hasSettings: Object.keys(settings).length > 0,
      ...metadata
    },
    data: {
      notes,
      folders,
      indexedFiles: files,
      settings
    }
  };
  
  // Convert to JSON string
  const jsonData = JSON.stringify(exportPackage, null, 2);
  
  // Create blob and return URL
  const blob = new Blob([jsonData], { type: 'application/json' });
  return URL.createObjectURL(blob);
}

/**
 * Download export file
 */
export function downloadExport(blobUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  
  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 100);
}
