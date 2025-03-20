import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Folder, 
  ServerCog, 
  Brain, 
  Palette, 
  WifiOff,
  CacheIcon
} from 'lucide-react';
import FolderMonitorSettings from './settings/FolderMonitorSettings';
import OfflineSettings from './settings/OfflineSettings';
import EmbeddingsSettings from './settings/EmbeddingsSettings';
import CacheSettings from './settings/CacheSettings';
// import ThemeSettings from './settings/ThemeSettings';
// import LMStudioSettings from './settings/LMStudioSettings';
import SafeThemeSettings from './settings/SafeThemeSettings';
import ErrorBoundary from './ErrorBoundary';

const SettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure application settings and preferences.
        </p>
      </div>

      <div className="flex-1 p-4 overflow-auto scrollbar-thin">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="folders" className="flex items-center gap-1">
              <Folder className="h-4 w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-1">
              <CacheIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Cache</span>
            </TabsTrigger>
            <TabsTrigger value="offline" className="flex items-center gap-1">
              <WifiOff className="h-4 w-4" />
              <span className="hidden sm:inline">Offline</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="flex-1 space-y-6">
            <div>
              <h3 className="text-lg font-medium">General Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure general application settings.
              </p>
            </div>
            <Separator />
            
            <div className="grid gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Application Preferences</h4>
                <p className="text-sm text-muted-foreground">
                  General settings will be implemented here.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="folders" className="flex-1">
            <FolderMonitorSettings />
          </TabsContent>
          
          <TabsContent value="ai" className="flex-1">
            {/* Wrap in error boundary for safer rendering */}
            <ErrorBoundary fallback={<p className="p-4">Error loading LM Studio settings</p>}>
              <EmbeddingsSettings />
            </ErrorBoundary>
          </TabsContent>
          
          <TabsContent value="cache" className="flex-1">
            <CacheSettings />
          </TabsContent>
          
          <TabsContent value="offline" className="flex-1">
            <OfflineSettings />
          </TabsContent>
          
          <TabsContent value="appearance" className="flex-1">
            <SafeThemeSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPanel;
