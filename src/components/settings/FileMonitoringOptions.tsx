import { useState } from 'react';
import { useFileMonitor } from '@/hooks/useFileMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderSearch, Filter, Clock, FileWarning } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TEXT_FILE_EXTENSIONS, EXCLUDED_DIRECTORIES } from '@/services/fileMonitor';

/**
 * Component to configure file monitoring options
 */
const FileMonitoringOptions = () => {
  const { monitoringOptions, updateMonitoringOptions, isMonitoring } = useFileMonitor();
  const [isOpen, setIsOpen] = useState(false);
  
  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Parse human-readable file size to bytes
  const parseFileSize = (value: string): number => {
    if (value.endsWith('MB')) {
      return parseFloat(value) * 1024 * 1024;
    }
    if (value.endsWith('KB')) {
      return parseFloat(value) * 1024;
    }
    return parseFloat(value);
  };
  
  // Format scan interval to human-readable format
  const formatScanInterval = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  // Calculate the appropriate interval value for the slider (logarithmic scale)
  const getScanIntervalValue = (): number => {
    const min = Math.log(5000); // 5 seconds
    const max = Math.log(300000); // 5 minutes
    const value = Math.log(monitoringOptions.scanInterval);
    return Math.round(((value - min) / (max - min)) * 100);
  };
  
  // Calculate interval in milliseconds from slider value
  const getIntervalFromValue = (value: number): number => {
    const min = Math.log(5000); // 5 seconds
    const max = Math.log(300000); // 5 minutes
    const scaled = (value / 100) * (max - min) + min;
    return Math.round(Math.exp(scaled));
  };
  
  // Handle the scan interval change
  const handleIntervalChange = (value: number[]) => {
    const intervalMs = getIntervalFromValue(value[0]);
    updateMonitoringOptions({ scanInterval: intervalMs });
  };
  
  // Handle max file size change
  const handleMaxFileSizeChange = (value: string) => {
    let maxSize: number;
    
    switch (value) {
      case '1MB':
        maxSize = 1024 * 1024;
        break;
      case '5MB':
        maxSize = 5 * 1024 * 1024;
        break;
      case '10MB':
        maxSize = 10 * 1024 * 1024;
        break;
      case '20MB':
        maxSize = 20 * 1024 * 1024;
        break;
      case '50MB':
        maxSize = 50 * 1024 * 1024;
        break;
      default:
        maxSize = 5 * 1024 * 1024; // Default to 5MB
    }
    
    updateMonitoringOptions({ maxFileSize: maxSize });
  };
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex justify-between items-center cursor-pointer">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <CardTitle className="text-base">Monitoring Options</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
                {isOpen ? 'Hide Options' : 'Show Options'}
              </Button>
            </div>
          </CollapsibleTrigger>
          <CardDescription>
            Configure how files are monitored and processed.
          </CardDescription>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="grid gap-5 pt-0">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="scan-interval" className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Scan Interval
                </Label>
                <span className="text-sm text-muted-foreground">
                  {formatScanInterval(monitoringOptions.scanInterval)}
                </span>
              </div>
              <Slider
                id="scan-interval"
                value={[getScanIntervalValue()]}
                onValueChange={handleIntervalChange}
                disabled={isMonitoring}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground">
                How often to check for file changes. Shorter intervals provide faster updates but use more resources.
              </p>
            </div>
            
            <Separator />
            
            <div className="grid gap-4">
              <Label className="flex items-center gap-1.5">
                <FileWarning className="h-4 w-4" />
                File Filtering
              </Label>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="textFilesOnly" className="text-sm cursor-pointer">
                      Text Files Only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Only process text-based files (markdown, code, etc.)
                    </p>
                  </div>
                  <Switch
                    id="textFilesOnly"
                    checked={monitoringOptions.textFilesOnly}
                    onCheckedChange={(checked) => 
                      updateMonitoringOptions({ textFilesOnly: checked })
                    }
                    disabled={isMonitoring}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="skipExcludedDirs" className="text-sm cursor-pointer">
                      Skip System Directories
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Skip directories like node_modules, .git, etc.
                    </p>
                  </div>
                  <Switch
                    id="skipExcludedDirs"
                    checked={monitoringOptions.skipExcludedDirs}
                    onCheckedChange={(checked) => 
                      updateMonitoringOptions({ skipExcludedDirs: checked })
                    }
                    disabled={isMonitoring}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="maxFileSize" className="text-sm">
                    Maximum File Size
                  </Label>
                  <Select
                    onValueChange={handleMaxFileSizeChange}
                    defaultValue={formatFileSize(monitoringOptions.maxFileSize)}
                    disabled={isMonitoring}
                  >
                    <SelectTrigger id="maxFileSize" className="w-full">
                      <SelectValue placeholder="Select max file size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1MB">1 MB</SelectItem>
                      <SelectItem value="5MB">5 MB</SelectItem>
                      <SelectItem value="10MB">10 MB</SelectItem>
                      <SelectItem value="20MB">20 MB</SelectItem>
                      <SelectItem value="50MB">50 MB</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Files larger than this will be skipped during indexing.
                  </p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <FolderSearch className="h-4 w-4" />
                File Types & Exclusions
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Text File Extensions</div>
                  <ScrollArea className="h-20 rounded-md border p-2">
                    <div className="flex flex-wrap gap-1">
                      {TEXT_FILE_EXTENSIONS.map((ext) => (
                        <div 
                          key={ext} 
                          className="px-1.5 py-0.5 bg-muted rounded text-xs"
                        >
                          .{ext}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Excluded Directories</div>
                  <ScrollArea className="h-20 rounded-md border p-2">
                    <div className="flex flex-wrap gap-1">
                      {EXCLUDED_DIRECTORIES.map((dir) => (
                        <div 
                          key={dir} 
                          className="px-1.5 py-0.5 bg-muted/70 rounded text-xs"
                        >
                          {dir}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These settings define which files are processed during folder monitoring.
              </p>
            </div>
            
            {isMonitoring && (
              <div className="text-sm text-amber-500 bg-amber-500/10 p-2 rounded">
                Note: Some settings can only be changed when monitoring is stopped.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default FileMonitoringOptions;
