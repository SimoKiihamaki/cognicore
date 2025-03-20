import { useEffect, useState } from 'react';
import { useFileMonitor } from '@/hooks/useFileMonitor';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
  Timer,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Component to display real-time file monitoring status
 */
const FileMonitoringStatus = () => {
  const {
    monitoredFolders,
    indexedFiles,
    isMonitoring,
    isLoading,
    startMonitoring,
    stopMonitoring
  } = useFileMonitor();

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTime, setActiveTime] = useState(0);
  const [fileStats, setFileStats] = useState({
    text: 0,
    markdown: 0,
    code: 0,
    other: 0
  });

  // Update file type statistics
  useEffect(() => {
    if (indexedFiles.length === 0) return;

    const stats = {
      text: 0,
      markdown: 0,
      code: 0,
      other: 0
    };

    indexedFiles.forEach(file => {
      const type = file.filetype.toLowerCase();
      if (type === 'text/markdown' || file.filename.endsWith('.md')) {
        stats.markdown++;
      } else if (type === 'text/plain' || file.filename.endsWith('.txt')) {
        stats.text++;
      } else if (
        type.includes('javascript') || 
        type.includes('typescript') ||
        type.includes('json') ||
        file.filename.match(/\.(js|ts|jsx|tsx|json|py|java|c|cpp|cs|html|css)$/i)
      ) {
        stats.code++;
      } else {
        stats.other++;
      }
    });

    setFileStats(stats);
  }, [indexedFiles]);

  // Update time tracking for active monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isMonitoring) {
      setLastUpdate(new Date());
      
      interval = setInterval(() => {
        setActiveTime(prev => prev + 1);
      }, 1000);
    } else {
      setActiveTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  // Format seconds to human-readable time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const activeFolderCount = monitoredFolders.filter(f => f.isActive).length;
  const totalFolderCount = monitoredFolders.length;
  const monitoringProgress = totalFolderCount ? (activeFolderCount / totalFolderCount) * 100 : 0;

  return (
    <Card className={isMonitoring ? 'border-primary/30' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoring Status
            {isMonitoring && (
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                Active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            disabled={isLoading || monitoredFolders.length === 0}
            className="h-8"
          >
            {isMonitoring ? "Stop" : "Start"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pb-2 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center">
                <HardDrive className="h-3 w-3 mr-1" />
                Monitored Folders
              </span>
              <span className="font-medium">{activeFolderCount}/{totalFolderCount}</span>
            </div>
            <Progress value={monitoringProgress} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Monitoring Time
              </span>
              <span className="font-medium">{formatTime(activeTime)}</span>
            </div>
            <div className={`h-2 rounded-full ${isMonitoring ? 'bg-primary/20' : 'bg-muted'}`}>
              {isMonitoring && (
                <div className="h-full w-full bg-primary rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className="text-lg font-medium">{fileStats.markdown}</div>
                  <div className="text-xs text-muted-foreground">Markdown</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Markdown files (.md)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className="text-lg font-medium">{fileStats.text}</div>
                  <div className="text-xs text-muted-foreground">Text</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Plain text files (.txt)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className="text-lg font-medium">{fileStats.code}</div>
                  <div className="text-xs text-muted-foreground">Code</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Code files (.js, .ts, .py, etc.)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className="text-lg font-medium">{fileStats.other}</div>
                  <div className="text-xs text-muted-foreground">Other</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Other file types</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isMonitoring && (
          <div className="text-sm space-y-2">
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Monitoring active folders for changes</span>
              </div>
              <div className="text-xs">
                {lastUpdate && `Last check: ${lastUpdate.toLocaleTimeString()}`}
              </div>
            </div>
          </div>
        )}
        
        {!isMonitoring && totalFolderCount > 0 && (
          <div className="text-sm flex items-center justify-center gap-2 p-2 bg-muted/30 rounded-md text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Monitoring is currently inactive</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 text-xs text-muted-foreground">
        {isMonitoring ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span>
              Automatically indexing files from {activeFolderCount} folder{activeFolderCount !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            <span>Press Start to begin monitoring folders</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default FileMonitoringStatus;
