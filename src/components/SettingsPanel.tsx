
import { useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Settings } from '@/lib/types';
import { organizeNotes } from '@/utils/noteOrganizer';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { toast } from '@/components/ui/use-toast';

const SettingsPanel = () => {
  const [settings, setSettings] = useLocalStorage<Settings>('cognicore-settings', {
    lmStudioBaseUrl: 'http://localhost:1234/v1',
    lmStudioApiKey: '',
    primaryModelName: 'Meta-Llama-3-8B-Instruct',
    secondaryModelName: 'Phi-3-mini-4k-instruct',
    folderPaths: [],
    similarityThreshold: 0.75,
    autoOrganizeNotes: false,
    embeddingModelName: 'Xenova/all-MiniLM-L6-v2'
  });
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const { notes, updateNote } = useNotes();
  const { folders } = useFolders();
  
  const handleInputChange = (field: keyof Settings, value: any) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };
  
  const handleAutoOrganizeToggle = () => {
    const newValue = !settings.autoOrganizeNotes;
    setSettings({
      ...settings,
      autoOrganizeNotes: newValue
    });
  };
  
  const handleSimilarityThresholdChange = (value: number) => {
    setSettings({
      ...settings,
      similarityThreshold: Math.max(0, Math.min(1, value))
    });
  };
  
  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('untested');
    
    try {
      const response = await fetch(`${settings.lmStudioBaseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.lmStudioApiKey}`
        }
      });
      
      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "Connection successful",
          description: "Successfully connected to LM Studio",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection failed",
          description: `Error: ${response.statusText}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  const triggerAutoOrganize = async () => {
    if (!settings.autoOrganizeNotes) {
      toast({
        title: "Auto-organize is disabled",
        description: "Enable auto-organize in settings first",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Organizing notes",
      description: "This may take a moment...",
    });
    
    try {
      const count = await organizeNotes(
        notes,
        folders,
        (noteId, folderId) => updateNote(noteId, { folderId }),
        settings.embeddingModelName,
        settings.similarityThreshold
      );
      
      toast({
        title: "Organization complete",
        description: `${count} notes were organized into folders`,
      });
    } catch (error) {
      toast({
        title: "Organization failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="h-full flex flex-col overflow-auto scrollbar-thin">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure CogniCore to connect with your local LM Studio instance.
        </p>
      </div>
      
      <div className="flex-1 p-4 space-y-6">
        <div className="space-y-4">
          <h3 className="text-md font-medium">LM Studio Connection</h3>
          
          <div className="glass p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="baseUrl">
                Base URL
              </label>
              <input
                id="baseUrl"
                type="text"
                value={settings.lmStudioBaseUrl}
                onChange={(e) => handleInputChange('lmStudioBaseUrl', e.target.value)}
                className="w-full p-2 rounded-md border border-border bg-background"
                placeholder="http://localhost:1234/v1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The URL where LM Studio is running (usually http://localhost:1234/v1)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="apiKey">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={settings.lmStudioApiKey}
                onChange={(e) => handleInputChange('lmStudioApiKey', e.target.value)}
                className="w-full p-2 rounded-md border border-border bg-background"
                placeholder="Your LM Studio API key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty if LM Studio doesn't require authentication
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={testConnection}
                disabled={isTestingConnection}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 ${
                  connectionStatus === 'success'
                    ? 'bg-green-600/20 text-green-600 hover:bg-green-600/30'
                    : connectionStatus === 'error'
                    ? 'bg-red-600/20 text-red-600 hover:bg-red-600/30'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Models</h3>
          
          <div className="glass p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="primaryModel">
                Primary Model
              </label>
              <input
                id="primaryModel"
                type="text"
                value={settings.primaryModelName}
                onChange={(e) => handleInputChange('primaryModelName', e.target.value)}
                className="w-full p-2 rounded-md border border-border bg-background"
                placeholder="Model name (e.g., Meta-Llama-3-8B-Instruct)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for detailed interactions. Should match exactly the model name in LM Studio.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="secondaryModel">
                Secondary Model
              </label>
              <input
                id="secondaryModel"
                type="text"
                value={settings.secondaryModelName}
                onChange={(e) => handleInputChange('secondaryModelName', e.target.value)}
                className="w-full p-2 rounded-md border border-border bg-background"
                placeholder="Model name (e.g., Phi-3-mini-4k-instruct)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for rapid tasks. Should be a faster, lighter model.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="embeddingModel">
                Embedding Model
              </label>
              <input
                id="embeddingModel"
                type="text"
                value={settings.embeddingModelName}
                onChange={(e) => handleInputChange('embeddingModelName', e.target.value)}
                className="w-full p-2 rounded-md border border-border bg-background"
                placeholder="Model name (e.g., Xenova/all-MiniLM-L6-v2)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for creating note embeddings and calculating similarity.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-md font-medium">Note Organization</h3>
          
          <div className="glass p-4 rounded-lg space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoOrganizeNotes}
                  onChange={handleAutoOrganizeToggle}
                  className="rounded"
                />
                <span>Auto-organize notes using embedding model</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Automatically suggest folder organization based on note content
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="similarityThreshold">
                Similarity Threshold: {settings.similarityThreshold.toFixed(2)}
              </label>
              <input
                id="similarityThreshold"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.similarityThreshold}
                onChange={(e) => handleSimilarityThresholdChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher values require notes to be more similar to be connected in the graph view.
              </p>
            </div>
            
            <div className="pt-2">
              <button
                onClick={triggerAutoOrganize}
                disabled={!settings.autoOrganizeNotes}
                className={`w-full py-2 rounded-md ${
                  settings.autoOrganizeNotes
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Organize Notes Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
