/**
 * File Monitoring Settings
 * 
 * Provides a UI for configuring and managing file monitoring
 */
import { useFileMonitor } from '@/hooks/useFileMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderIcon, FileIcon, Settings, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import FolderMonitoringSetup from '@/components/fileSystem/FolderMonitoringSetup';
import FileMonitoringOptions from './FileMonitoringOptions';
import FileMonitoringStatus from './FileMonitoringStatus';

/**
 * Component for file monitoring settings
 */
const FileMonitorSettings = () => {
  const { monitoredFolders, indexedFiles, stats } = useFileMonitor();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="h-5 w-5" />
            File Monitoring
          </CardTitle>
          <CardDescription>
            Monitor folders for changes and automatically index files
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="folders" className="border-b">
            <div className="px-4">
              <TabsList className="w-full justify-start mb-0 mt-0">
                <TabsTrigger value="folders" className="flex items-center gap-1.5">
                  <FolderIcon className="h-4 w-4" />
                  Folders
                </TabsTrigger>
                <TabsTrigger value="status" className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  Status
                </TabsTrigger>
                <TabsTrigger value="options" className="flex items-center gap-1.5">
                  <Settings className="h-4 w-4" />
                  Options
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="folders" className="m-0 p-4 border-0">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <FolderMonitoringSetup />
                </div>
                
                <div className="lg:w-64 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileIcon className="h-4 w-4" />
                        File Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Monitored Folders:</span>
                          <span className="font-medium">{monitoredFolders.length}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Indexed Files:</span>
                          <span className="font-medium">{indexedFiles.length}</span>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="text-sm font-medium mb-1">File Types:</div>
                        <ScrollArea className="h-32">
                          <div className="space-y-1">
                            {stats && Object.entries(stats.fileTypes).length > 0 ? (
                              Object.entries(stats.fileTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => (
                                  <div key={type} className="flex justify-between items-center text-xs">
                                    <span>.{type}</span>
                                    <span className="font-medium">{count}</span>
                                  </div>
                                ))
                            ) : (
                              <div className="text-xs text-muted-foreground py-2 text-center">
                                No files indexed yet
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="status" className="m-0 p-4 border-0">
              <FileMonitoringStatus />
            </TabsContent>
            
            <TabsContent value="options" className="m-0 p-4 border-0">
              <FileMonitoringOptions />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileMonitorSettings;
