
import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Settings } from '@/lib/types';
import { Save, Plus, X } from 'lucide-react';

const defaultSettings: Settings = {
  lmStudioBaseUrl: 'http://localhost:1234/v1',
  lmStudioApiKey: '',
  primaryModelName: 'default-model',
  secondaryModelName: '',
  folderPaths: [],
  similarityThreshold: 0.7,
  autoOrganizeNotes: false,
  embeddingModelName: 'Xenova/all-MiniLM-L6-v2'
};

const SettingsPanel = () => {
  const [settings, setSettings] = useLocalStorage<Settings>('settings', defaultSettings);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate saving
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };
  
  const testConnection = () => {
    setTestStatus('testing');
    
    // Simulate testing connection
    setTimeout(() => {
      // Randomly succeed or fail for demo purposes
      setTestStatus(Math.random() > 0.5 ? 'success' : 'error');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setTestStatus('idle');
      }, 3000);
    }, 1500);
  };
  
  const addFolderPath = () => {
    if (newFolderPath && !settings.folderPaths.includes(newFolderPath)) {
      setSettings({
        ...settings,
        folderPaths: [...settings.folderPaths, newFolderPath]
      });
      setNewFolderPath('');
    }
  };
  
  const removeFolderPath = (path: string) => {
    setSettings({
      ...settings,
      folderPaths: settings.folderPaths.filter(p => p !== path)
    });
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your LM Studio connection and preferences.
        </p>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
        <div className="space-y-6 animate-fade-in">
          <div className="space-y-3">
            <h3 className="text-md font-medium">LM Studio Connection</h3>
            
            <div className="space-y-2">
              <label htmlFor="baseUrl" className="text-sm">Base URL</label>
              <input
                id="baseUrl"
                type="text"
                value={settings.lmStudioBaseUrl}
                onChange={(e) => setSettings({...settings, lmStudioBaseUrl: e.target.value})}
                className="w-full glass px-3 py-2 rounded-lg focus:outline-none focus-ring"
                placeholder="http://localhost:1234/v1"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm">API Key (optional)</label>
              <input
                id="apiKey"
                type="password"
                value={settings.lmStudioApiKey}
                onChange={(e) => setSettings({...settings, lmStudioApiKey: e.target.value})}
                className="w-full glass px-3 py-2 rounded-lg focus:outline-none focus-ring"
                placeholder="Enter API key if required"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={testConnection}
                disabled={testStatus === 'testing'}
                className={`px-3 py-1.5 rounded-lg focus-ring ${
                  testStatus === 'testing'
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : testStatus === 'success'
                    ? 'bg-green-600/20 text-green-600'
                    : testStatus === 'error'
                    ? 'bg-destructive/20 text-destructive'
                    : 'glass button-hover-effect'
                }`}
              >
                {testStatus === 'testing' ? 'Testing...' : 
                 testStatus === 'success' ? 'Connected successfully' : 
                 testStatus === 'error' ? 'Connection failed' : 
                 'Test Connection'}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-md font-medium">Model Configuration</h3>
            
            <div className="space-y-2">
              <label htmlFor="primaryModel" className="text-sm">Primary Model</label>
              <input
                id="primaryModel"
                type="text"
                value={settings.primaryModelName}
                onChange={(e) => setSettings({...settings, primaryModelName: e.target.value})}
                className="w-full glass px-3 py-2 rounded-lg focus:outline-none focus-ring"
                placeholder="Model name for detailed tasks"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="secondaryModel" className="text-sm">Secondary Model (optional)</label>
              <input
                id="secondaryModel"
                type="text"
                value={settings.secondaryModelName}
                onChange={(e) => setSettings({...settings, secondaryModelName: e.target.value})}
                className="w-full glass px-3 py-2 rounded-lg focus:outline-none focus-ring"
                placeholder="Model name for lightweight tasks"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use only the primary model.
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="embeddingModel" className="text-sm">Embedding Model</label>
              <input
                id="embeddingModel"
                type="text"
                value={settings.embeddingModelName}
                onChange={(e) => setSettings({...settings, embeddingModelName: e.target.value})}
                className="w-full glass px-3 py-2 rounded-lg focus:outline-none focus-ring"
                placeholder="Model name for embeddings generation"
              />
              <p className="text-xs text-muted-foreground">
                Used for indexing and similarity connections.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-md font-medium">Folder Paths</h3>
            <p className="text-sm text-muted-foreground">
              Specify folders to monitor for files.
            </p>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  placeholder="Enter folder path"
                  className="flex-1 glass px-3 py-2 rounded-lg focus:outline-none focus-ring"
                />
                
                <button
                  onClick={addFolderPath}
                  disabled={!newFolderPath}
                  className={`px-3 py-2 rounded-lg flex items-center ${
                    !newFolderPath
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 button-hover-effect focus-ring'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2 mt-2">
                {settings.folderPaths.length > 0 ? (
                  settings.folderPaths.map((path, index) => (
                    <div key={index} className="flex items-center justify-between glass px-3 py-2 rounded-lg">
                      <span className="text-sm truncate flex-1">{path}</span>
                      <button
                        onClick={() => removeFolderPath(path)}
                        className="ml-2 p-1 rounded-md hover:bg-secondary button-hover-effect focus-ring"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No folders added yet.
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-md font-medium">Note Connections</h3>
            
            <div className="space-y-2">
              <label htmlFor="threshold" className="text-sm flex justify-between">
                <span>Similarity Threshold: {settings.similarityThreshold.toFixed(2)}</span>
              </label>
              <input
                id="threshold"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.similarityThreshold}
                onChange={(e) => setSettings({...settings, similarityThreshold: parseFloat(e.target.value)})}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher values require notes to be more similar to be connected in the graph.
              </p>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="autoOrganize" className="text-sm">Auto-organize notes</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    id="autoOrganize"
                    type="checkbox"
                    checked={settings.autoOrganizeNotes}
                    onChange={(e) => setSettings({...settings, autoOrganizeNotes: e.target.checked})}
                    className="sr-only"
                  />
                  <div 
                    className={`block h-6 rounded-full ${settings.autoOrganizeNotes ? 'bg-primary' : 'bg-gray-600'} transition-colors`}
                  >
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        settings.autoOrganizeNotes ? 'transform translate-x-4' : ''
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Let the embedding model suggest how to organize your notes into folders.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 ${
            isSaving
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 button-hover-effect focus-ring'
          }`}
        >
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
