import { useState } from 'react';
import { useFileMonitor } from '@/hooks/useFileMonitor';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { 
  FolderPlus, 
  FolderMinus, 
  File, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Loader2, 
  PlayCircle, 
  StopCircle,
  Trash 
} from 'lucide-react';

import FileMonitoringStatus from './FileMonitoringStatus';
import FileMonitoringOptions from './FileMonitoringOptions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

const FolderMonitorSettings = () => {
  const { 
    monitoredFolders,
    indexedFiles,
    isMonitoring,
    isLoading,
    isSupported,
    folderStats,
    startMonitoring,
    stopMonitoring,
    addFolder,
    removeFolder,
    toggleFolderActive,
    processIndexedFiles,
    clearFolderFiles,
    clearAllFiles
  } = useFileMonitor();
  
  const { toast } = useToast();
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [folderToClear, setFolderToClear] = useState<string | null>(null);
  
  // Handle adding a new folder
  const handleAddFolder = async () => {
    await addFolder();
  };
  
  // Handle clearing a specific folder's files
  const handleClearFolder = (folderId: string) => {
    setFolderToClear(folderId);
  };
  
  // Execute folder file clearing
  const confirmClearFolder = () => {
    if (folderToClear) {
      clearFolderFiles(folderToClear);
      setFolderToClear(null);
    }
  };
  
  if (!isSupported) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>File System Access Not Supported</CardTitle>
          <CardDescription>
            Your browser does not support the File System Access API needed for folder monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To use this feature, please try a different browser such as Chrome or Edge.
            File System Access API is required to monitor folders for changes.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Monitoring Status Overview */}
      <FileMonitoringStatus />
      
      {/* Monitoring Options */}
      <FileMonitoringOptions />
      
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Monitored Folders</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFolder}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4" />
                Add Folder
              </>
            )}
          </Button>
        </div>
        
        {monitoredFolders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <p className="mt-2 text-muted-foreground">
                No folders are being monitored. Click "Add Folder" to start.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {monitoredFolders.map(folder => {
              const stats = folderStats.find(s => s.id === folder.id);
              const fileCount = indexedFiles.filter(file => file.filepath.startsWith(folder.path)).length;
              
              return (
                <Card key={folder.id} className={folder.isActive ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{folder.path}</CardTitle>
                        <CardDescription>
                          {folder.isActive ? 'Active' : 'Inactive'} - {fileCount} indexed files
                          {stats?.lastScanTime && (
                            <span className="ml-2">
                              (Last scan: {stats.lastScanTime.toLocaleTimeString()})
                            </span>
                          )}
                          {stats?.errorCount ? (
                            <span className="text-destructive ml-2">
                              ({stats.errorCount} error{stats.errorCount !== 1 ? 's' : ''})
                            </span>
                          ) : null}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={folder.isActive}
                          onCheckedChange={() => toggleFolderActive(folder.id)}
                          disabled={isLoading}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleClearFolder(folder.id)}
                          disabled={isLoading || fileCount === 0}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <File className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFolder(folder.id)}
                          disabled={isLoading}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {stats?.lastError && (
                    <CardContent className="pt-0 pb-3">
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Monitoring Error</p>
                          <p>{stats.lastError}</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="grid gap-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium">Indexed Files</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearAll(true)}
              disabled={isLoading || indexedFiles.length === 0}
              className="flex items-center gap-1"
            >
              <Trash className="h-4 w-4" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={processIndexedFiles}
              disabled={isLoading || indexedFiles.length === 0}
              className="flex items-center gap-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Process Files</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        {indexedFiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <File className="h-12 w-12 mx-auto text-muted-foreground/60" />
              <p className="mt-2 text-muted-foreground">
                No files have been indexed yet. Add folders to monitor.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Indexed Files</span>
                <span className="text-sm font-normal bg-muted px-2 py-0.5 rounded-md">
                  {indexedFiles.length} total
                </span>
              </CardTitle>
              <CardDescription>
                Files are indexed from monitored folders and used for similarity detection.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-60 overflow-y-auto scrollbar-thin text-sm">
              <div className="space-y-1">
                {indexedFiles.slice(0, 15).map(file => (
                  <div key={file.id} className="flex items-center justify-between gap-2 py-1 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 truncate">
                      <File className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(file.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {indexedFiles.length > 15 && (
                  <div className="text-center pt-2 text-muted-foreground text-xs">
                    {indexedFiles.length - 15} more files indexed...
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground py-2">
              Files are stored locally in your browser's IndexedDB.
            </CardFooter>
          </Card>
        )}
      </div>
      
      {/* Clear Folder Files Confirmation Dialog */}
      <Dialog open={!!folderToClear} onOpenChange={(open) => !open && setFolderToClear(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Folder Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all indexed files from this folder?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {folderToClear && (
              <p>
                <span className="font-medium">Folder:</span>{' '}
                {monitoredFolders.find(f => f.id === folderToClear)?.path}
              </p>
            )}
            <p className="mt-2 text-muted-foreground text-sm">
              Note: This will only remove the indexed files from browser storage.
              The original files on your computer will not be affected.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderToClear(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearFolder}>
              Clear Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Clear All Files Confirmation Dialog */}
      <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Indexed Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all indexed files?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              <span className="font-medium">Total Files:</span> {indexedFiles.length}
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              Note: This will only remove the indexed files from browser storage.
              The original files on your computer will not be affected.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClearAll(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                clearAllFiles();
                setConfirmClearAll(false);
              }}
            >
              Clear All Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FolderMonitorSettings;
