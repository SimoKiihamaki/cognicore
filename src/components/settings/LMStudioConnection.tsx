
import { useState } from 'react';
import { Settings } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

interface LMStudioConnectionProps {
  settings: Settings;
  onUpdateSettings: (field: keyof Settings, value: any) => void;
}

const LMStudioConnection = ({ settings, onUpdateSettings }: LMStudioConnectionProps) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');

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

  return (
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
            onChange={(e) => onUpdateSettings('lmStudioBaseUrl', e.target.value)}
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
            onChange={(e) => onUpdateSettings('lmStudioApiKey', e.target.value)}
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
  );
};

export default LMStudioConnection;
