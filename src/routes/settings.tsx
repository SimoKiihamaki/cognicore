import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Import settings components
import ThemeSettings from '@/components/settings/ThemeSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import LMStudioSettings from '@/components/settings/LMStudioSettings';
// Removing redundant ModelSettings since it overlaps with LMStudioSettings
import FileMonitorSettings from '@/components/settings/FileMonitorSettings';
import OfflineSettings from '@/components/settings/OfflineSettings';
import CacheSettings from '@/components/settings/CacheSettings';
import ContentOrganization from '@/components/settings/ContentOrganization';
import EmbeddingsSettings from '@/components/settings/EmbeddingsSettings';

/**
 * Settings route component that provides configuration options
 * for LM Studio, appearance, file monitoring, and more.
 */
const SettingsRoute = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('appearance');
  const [isDirty, setIsDirty] = useState(false);
  
  // Save all settings
  const handleSaveAll = () => {
    // This would typically dispatch actions to save all settings
    // For now, just show a toast
    toast({
      title: 'Settings saved',
      description: 'Your settings have been saved successfully',
    });
    setIsDirty(false);
  };
  
  // Reset all settings
  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      // This would typically dispatch actions to reset all settings
      toast({
        title: 'Settings reset',
        description: 'All settings have been reset to default values',
      });
      setIsDirty(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Settings | CogniCore</title>
        <meta name="description" content="Configure CogniCore settings" />
      </Helmet>

      <div className="container mx-auto p-4 h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure CogniCore to your preferences</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
            >
              Reset All
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={!isDirty}
            >
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[200px_1fr] gap-4 h-full overflow-hidden">
          {/* Settings tabs sidebar */}
          <div className="border rounded-lg bg-card">
            <div className="p-2">
              <Tabs 
                orientation="vertical" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full h-full"
              >
                <TabsList className="flex flex-col w-full h-auto items-stretch p-0 bg-transparent">
                  <TabsTrigger 
                    value="appearance" 
                    className="justify-start text-left py-2 px-3 mb-1"
                  >
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai" 
                    className="justify-start text-left py-2 px-3 mb-1"
                  >
                    AI Integration
                  </TabsTrigger>
                  <TabsTrigger 
                    value="files" 
                    className="justify-start text-left py-2 px-3 mb-1"
                  >
                    File Management
                  </TabsTrigger>
                  <TabsTrigger 
                    value="organization" 
                    className="justify-start text-left py-2 px-3 mb-1"
                  >
                    Content Organization
                  </TabsTrigger>
                  <TabsTrigger 
                    value="advanced" 
                    className="justify-start text-left py-2 px-3 mb-1"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Settings content */}
          <div className="border rounded-lg bg-card overflow-hidden">
            <ScrollArea className="h-full">
              <Tabs value={activeTab} className="p-6">
                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-6 mt-0">
                  <h2 className="text-xl font-semibold">Appearance Settings</h2>
                  <Separator />
                  
                  <div className="space-y-6">
                    <ThemeSettings onChange={() => setIsDirty(true)} />
                    <AppearanceSettings onChange={() => setIsDirty(true)} />
                  </div>
                </TabsContent>

                {/* AI Integration Tab */}
                <TabsContent value="ai" className="space-y-6 mt-0">
                  <h2 className="text-xl font-semibold">AI Integration Settings</h2>
                  <Separator />
                  
                  <div className="space-y-6">
                    <LMStudioSettings onChange={() => setIsDirty(true)} />
                    <EmbeddingsSettings onChange={() => setIsDirty(true)} />
                  </div>
                </TabsContent>

                {/* File Management Tab */}
                <TabsContent value="files" className="space-y-6 mt-0">
                  <h2 className="text-xl font-semibold">File Management Settings</h2>
                  <Separator />
                  
                  <div className="space-y-6">
                    <FileMonitorSettings onChange={() => setIsDirty(true)} />
                  </div>
                </TabsContent>

                {/* Content Organization Tab */}
                <TabsContent value="organization" className="space-y-6 mt-0">
                  <h2 className="text-xl font-semibold">Content Organization Settings</h2>
                  <Separator />
                  
                  <div className="space-y-6">
                    <ContentOrganization onChange={() => setIsDirty(true)} />
                  </div>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-6 mt-0">
                  <h2 className="text-xl font-semibold">Advanced Settings</h2>
                  <Separator />
                  
                  <div className="space-y-6">
                    <OfflineSettings onChange={() => setIsDirty(true)} />
                    <CacheSettings onChange={() => setIsDirty(true)} />
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-500">Danger Zone</CardTitle>
                        <CardDescription>
                          These actions are destructive and cannot be undone
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Reset Application</h3>
                            <p className="text-sm text-muted-foreground">
                              Clear all data and reset to default settings
                            </p>
                          </div>
                          <Button 
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to reset the application? All data will be lost.')) {
                                // This would typically dispatch actions to reset the application
                                toast({
                                  title: 'Application reset',
                                  description: 'All data and settings have been reset',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            Reset App
                          </Button>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Purge Embeddings</h3>
                            <p className="text-sm text-muted-foreground">
                              Delete all generated embeddings to free up space
                            </p>
                          </div>
                          <Button 
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete all embeddings? You will need to regenerate them.')) {
                                // This would typically dispatch actions to delete embeddings
                                toast({
                                  title: 'Embeddings purged',
                                  description: 'All embeddings have been deleted',
                                });
                              }
                            }}
                          >
                            Purge
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsRoute;
