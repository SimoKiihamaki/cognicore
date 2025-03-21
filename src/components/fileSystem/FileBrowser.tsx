/**
 * File Browser component
 * Displays files from a selected directory with File System Access API
 * or from indexed files with fallback method
 */

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileTextIcon,
  FolderIcon,
  FileIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  EyeIcon
} from 'lucide-react';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useIndexedDB } from '@/hooks/useIndexedDB';
import { STORE_NAMES } from '@/services/database/databaseService';
import { formatDistanceToNow } from 'date-fns';

interface FileRowProps {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
  onOpen: () => void;
  onView?: () => void;
}

const FileRow: React.FC<FileRowProps> = ({
  name,
  type,
  size,
  lastModified,
  onOpen,
  onView
}) => {
  // Format file size to human-readable format
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return 'N/A';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <TableRow>
      <TableCell className="flex items-center gap-2">
        {type === 'directory' ? <FolderIcon size={16} /> : <FileTextIcon size={16} />}
        <span className="truncate max-w-[300px]">{name}</span>
      </TableCell>
      <TableCell>
        <Badge variant={type === 'directory' ? 'secondary' : 'outline'}>
          {type === 'directory' ? 'Folder' : name.split('.').pop()?.toUpperCase() || 'FILE'}
        </Badge>
      </TableCell>
      <TableCell>{formatFileSize(size)}</TableCell>
      <TableCell>
        {lastModified ? formatDistanceToNow(lastModified, { addSuffix: true }) : 'N/A'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {type === 'file' && onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              <EyeIcon size={16} />
              <span className="sr-only">View</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onOpen}>
            {type === 'directory' ? 'Open' : 'Select'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

interface FileBrowserProps {
  onFileSelected?: (file: File | FileSystemFileHandle) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  onFileSelected
}) => {
  const [currentDirHandle, setCurrentDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [entries, setEntries] = useState<[string, FileSystemHandle][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{name: string, handle: FileSystemDirectoryHandle}[]>([]);
  
  const { 
    directoryHandle,
    listDirectory,
    readFile
  } = useFileSystem();
  
  const { data: indexedFiles } = useIndexedDB(STORE_NAMES.FILES);

  // Load entries when directory handle changes
  useEffect(() => {
    if (directoryHandle && !currentDirHandle) {
      setCurrentDirHandle(directoryHandle);
      setBreadcrumbs([{ name: directoryHandle.name, handle: directoryHandle }]);
      loadEntries(directoryHandle);
    }
  }, [directoryHandle]);

  // Load entries for the current directory
  const loadEntries = async (dirHandle: FileSystemDirectoryHandle) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await listDirectory(dirHandle);
      
      if (result.success && result.data) {
        setEntries(Array.from(result.data.entries()));
      } else {
        setError(result.error || 'Failed to list directory contents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle directory navigation
  const handleOpenDirectory = async (handle: FileSystemDirectoryHandle) => {
    setCurrentDirHandle(handle);
    
    // Update breadcrumbs
    setBreadcrumbs(prev => {
      // Check if we're already in the breadcrumbs (navigating back)
      const existingIndex = prev.findIndex(item => item.handle === handle);
      
      if (existingIndex >= 0) {
        // We're navigating back, truncate the breadcrumbs
        return prev.slice(0, existingIndex + 1);
      } else {
        // We're navigating forward, add to the breadcrumbs
        return [...prev, { name: handle.name, handle }];
      }
    });
    
    await loadEntries(handle);
  };

  // Handle file selection
  const handleFileSelect = async (handle: FileSystemFileHandle) => {
    if (onFileSelected) {
      onFileSelected(handle);
    }
  };

  // Handle file view (read content)
  const handleViewFile = async (handle: FileSystemFileHandle) => {
    const result = await readFile(handle);
    
    if (result.success && result.data) {
      // Here you could show a modal with the file content
      // or navigate to a file viewer page
      console.log('File content:', result.data);
      alert(`File content (first 100 chars): ${result.data.substring(0, 100)}...`);
    }
  };

  // Navigate to parent directory
  const navigateUp = () => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      handleOpenDirectory(parentBreadcrumb.handle);
    }
  };

  // Refresh current directory
  const refreshDirectory = () => {
    if (currentDirHandle) {
      loadEntries(currentDirHandle);
    }
  };

  // Render files from IndexedDB when no directory handle is available
  const renderIndexedFiles = () => {
    return (
      <>
        <TableCaption>
          Showing {indexedFiles.length} indexed files. 
          Select a directory for live file access.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {indexedFiles.map(file => (
            <FileRow
              key={file.id}
              name={file.filename}
              type="file"
              size={file.size}
              lastModified={file.lastModified}
              onOpen={() => {/* Open indexed file */}}
              onView={() => {/* View indexed file */}}
            />
          ))}
        </TableBody>
      </>
    );
  };

  // Render files from File System Access API
  const renderDirectoryContents = () => {
    // Sort entries: directories first, then files, alphabetically
    const sortedEntries = [...entries].sort(([nameA, handleA], [nameB, handleB]) => {
      if (handleA.kind !== handleB.kind) {
        return handleA.kind === 'directory' ? -1 : 1;
      }
      return nameA.localeCompare(nameB);
    });
    
    return (
      <>
        <TableCaption>
          Showing {entries.length} items in {currentDirHandle?.name || 'selected directory'}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map(([name, handle]) => (
            <FileRow
              key={name}
              name={name}
              type={handle.kind}
              onOpen={() => {
                if (handle.kind === 'directory') {
                  handleOpenDirectory(handle as FileSystemDirectoryHandle);
                } else {
                  handleFileSelect(handle as FileSystemFileHandle);
                }
              }}
              onView={handle.kind === 'file' ? () => handleViewFile(handle as FileSystemFileHandle) : undefined}
            />
          ))}
          
          {entries.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                This directory is empty
              </TableCell>
            </TableRow>
          )}
          
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                Loading...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </>
    );
  };

  // Render breadcrumbs for navigation
  const renderBreadcrumbs = () => {
    if (breadcrumbs.length <= 1) return null;
    
    return (
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleOpenDirectory(item.handle)}
              className={index === breadcrumbs.length - 1 ? 'font-semibold' : ''}
            >
              {item.name}
            </Button>
            {index < breadcrumbs.length - 1 && (
              <span className="text-muted-foreground">/</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/20 p-4 rounded-md mb-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      {renderBreadcrumbs()}
      
      <div className="flex gap-2 mb-4">
        {breadcrumbs.length > 1 && (
          <Button variant="outline" size="sm" onClick={navigateUp}>
            <ChevronLeftIcon size={16} className="mr-1" />
            Up
          </Button>
        )}
        
        <Button variant="outline" size="sm" onClick={refreshDirectory} disabled={!currentDirHandle}>
          <RefreshCwIcon size={16} className="mr-1" />
          Refresh
        </Button>
      </div>
      
      <Table>
        {currentDirHandle ? renderDirectoryContents() : renderIndexedFiles()}
      </Table>
    </div>
  );
};
