
import { useState, useCallback } from 'react';
import { useNotes } from '../useNotes';
import { useFolders } from '../useFolders';
import { useLocalStorage } from '../useLocalStorage';
import { useToast } from '@/components/ui/use-toast';
import { 
  exportData, 
  downloadExport 
} from '@/services/import-export/exportService';
import { ExportOptions } from './types';
import { Note } from '@/lib/types';

/**
 * Hook for managing export operations for CogniCore data
 */
export function useExport() {
  const { notes } = useNotes();
  const { folderTree } = useFolders();
  const [indexedFiles] = useLocalStorage('cognicore-indexed-files', []);
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);
  
  /**
   * Export data as a downloadable file
   */
  const exportItems = useCallback(async (exportOptions: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const notesToExport = exportOptions.includeNotes ? notes : [];
      
      const processedNotes = exportOptions.includeEmbeddings 
        ? notesToExport 
        : notesToExport.map(note => {
            const { embeddings, ...noteWithoutEmbeddings } = note;
            return noteWithoutEmbeddings as Note;
          });
      
      const foldersToExport = exportOptions.includeFolders ? folderTree : [];
      const filesToExport = exportOptions.includeFiles ? indexedFiles : [];
      
      const settingsToExport = exportOptions.includeSettings
        ? {
            lmStudio: JSON.parse(localStorage.getItem('lm-studio-config') || '{}'),
            appearance: JSON.parse(localStorage.getItem('appearance-settings') || '{}'),
            folders: JSON.parse(localStorage.getItem('cognicore-monitored-folders') || '[]')
          }
        : {};
      
      const metadata = {
        description: exportOptions.description,
        creator: 'CogniCore User',
        appVersion: '1.0.0'
      };
      
      const exportFormat = exportOptions.format;
      let blobUrl;
      let filename = `cognicore-export-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      
      if (exportFormat === 'json') {
        blobUrl = exportData(processedNotes, filesToExport, foldersToExport, settingsToExport, metadata);
        filename += '.json';
      } else if (exportFormat === 'markdown') {
        if (exportOptions.splitFiles) {
          blobUrl = exportData(processedNotes, [], [], {}, metadata);
          filename += '-markdown.zip';
        } else {
          const markdownContent = notesToExport.map(note => 
            `# ${note.title}\n\n${note.content}\n\n---\n\n`
          ).join('\n');
          
          const blob = new Blob([markdownContent], { type: 'text/markdown' });
          blobUrl = URL.createObjectURL(blob);
          filename += '.md';
        }
      } else if (exportFormat === 'csv') {
        const headers = 'id,title,createdAt,updatedAt,folderId\n';
        const rows = notesToExport.map(note => 
          `"${note.id}","${note.title.replace(/"/g, '""')}","${note.createdAt}","${note.updatedAt}","${note.folderId}"`
        ).join('\n');
        
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        blobUrl = URL.createObjectURL(blob);
        filename += '.csv';
      } else {
        throw new Error(`Unsupported export format: ${exportFormat}`);
      }
      
      if (blobUrl) {
        downloadExport(blobUrl, filename);
      }
      
      toast({
        title: "Export Successful",
        description: `Your data has been exported as ${exportFormat.toUpperCase()}.`,
      });
      
      return true;
    } catch (error) {
      console.error('Export error:', error);
      
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data.",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsExporting(false);
    }
  }, [notes, folderTree, indexedFiles, toast]);
  
  /**
   * Quick export all data as JSON
   */
  const quickExportAll = useCallback(async (includeEmbeddings: boolean = false) => {
    const description = 'Quick export of all data';
    return await exportItems({
      includeNotes: true,
      includeFolders: true,
      includeFiles: true,
      includeSettings: true,
      includeEmbeddings,
      description,
      format: 'json'
    });
  }, [exportItems]);
  
  /**
   * Export notes as Markdown
   */
  const exportNotesAsMarkdown = useCallback(async (splitFiles: boolean = false) => {
    const description = 'Notes exported as Markdown';
    return await exportItems({
      includeNotes: true,
      includeFolders: false,
      includeFiles: false,
      includeSettings: false,
      includeEmbeddings: false,
      description,
      format: 'markdown',
      splitFiles
    });
  }, [exportItems]);

  return {
    exportItems,
    quickExportAll,
    exportNotesAsMarkdown,
    isExporting
  };
}
