/**
 * ModelSettings component
 * 
 * Allows users to configure LM Studio model settings
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Brain, Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { LMStudioConfig } from '@/lib/types';
import lmStudioService from '@/services/lmStudio/lmStudioService';

// Default LM Studio configuration
const defaultConfig: LMStudioConfig = {
  baseUrl: 'http://localhost:1234',
  apiKey: '',
  primaryModelName: 'Meta-Llama-3-8B-Instruct',
  secondaryModelName: 'Phi-3-mini-4k-instruct',
  embeddingModelName: 'Xenova/all-MiniLM-L6-v2',
  connectionMode: 'local',
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 1024,
  useVision: false
};

// Available embedding models
const embeddingModels = [
  { name: 'MiniLM (Default)', value: 'Xenova/all-MiniLM-L6-v2' },
  { name: 'E5 Small', value: 'Xenova/e5-small-v2' },
  { name: 'MiniLM Large', value: 'Xenova/all-MiniLM-L12-v2' },
  { name: 'Multilingual E5', value: 'Xenova/multilingual-e5-small' }
];

// Model presets (for suggestion)
const modelPresets = [
  { name: 'Llama 3 8B Instruct', value: 'Meta-Llama-3-8B-Instruct' },
  { name: 'Llama 3 70B Instruct', value: 'Meta-Llama-3-70B-Instruct' },
  { name: 'Phi-3 Mini', value: 'Phi-3-mini-4k-instruct' },
  { name: 'Mistral 7B Instruct', value: 'Mistral-7B-Instruct-v0.2' },
  { name: 'Mistral Large', value: 'Mistral-Large-2-latest' },
  { name: 'Mixtral 8x7B', value: 'Mixtral-8x7B-Instruct-v0.1' }
];

// Component for managing LM Studio model settings
const ModelSettings = () => {
  const [config, setConfig] = useState<LMStudioConfig>(defaultConfig);
  const [initialConfig, setInitialConfig] = useState<LMStudioConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { toast } = useToast();
  
  // Load config from service on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const loadedConfig = lmStudioService.getConfig();
        setConfig(loadedConfig);
        setInitialConfig(loadedConfig);
      } catch (error) {
        console.error('Error loading LM Studio config:', error);
        toast({
          title: 'Error Loading Configuration',
          description: 'Failed to load LM Studio configuration',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, [toast]);
  
  // Check for changes
  useEffect(() => {
    // Compare current config with initial config
    const changes = JSON.stringify(config) !== JSON.stringify(initialConfig);
    setHasChanges(changes);
  }, [config, initialConfig]);
  
  // Handle config changes
  const handleConfigChange = (key: keyof LMStudioConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  // Test connection to LM Studio
  const testConnection = async () => {
    try {
      setIsTesting(true);
      
      // Apply current config for testing
      lmStudioService.updateConfig(config);
      
      // Test connection
      const connected = await lmStudioService.testConnection();
      setIsConnected(connected);
      
      // Show result
      if (connected) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to LM Studio',
        });
        
        // Try to get models
        try {
          const models = await fetch(`${config.baseUrl}/v1/models`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
            }
          });
          
          if (models.ok) {
            const data = await models.json();
            if (data.data && Array.isArray(data.data)) {
              const modelIds = data.data.map((model: any) => model.id);
              setDetectedModels(modelIds);
            }
          }
        } catch (error) {
          console.log('Could not fetch models, but connection was successful');
          // This is expected to fail in some LM Studio setups
        }
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect to LM Studio. Please check your settings.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setIsConnected(false);
      toast({
        title: 'Connection Error',
        description: 'Error occurred while testing connection',
        variant: 'destructive'
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Save changes
  const saveChanges = () => {
    try {
      lmStudioService.updateConfig(config);
      setInitialConfig(config);
      
      toast({
        title: 'Configuration Saved',
        description: 'LM Studio configuration has been saved',
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save configuration',
        variant: 'destructive'
      });
    }
  };
  
  // Reset to defaults
  const resetToDefaults = () => {
    setConfig(defaultConfig);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            LM Studio Connection
          </CardTitle>
          <CardDescription>
            Configure connection to LM Studio for AI capabilities
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={config.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="http://localhost:1234"
              />
              <p className="text-xs text-muted-foreground">
                The URL where LM Studio is running
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Leave empty if not required"
              />
              <p className="text-xs text-muted-foreground">
                API key for authentication (if required by your LM Studio setup)
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              
              {isConnected && (
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  Connected
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Model Settings</CardTitle>
          <CardDescription>
            Configure the models used by CogniCore
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="primaryModel">Primary Model (Detailed)</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryModel"
                  value={config.primaryModelName}
                  onChange={(e) => handleConfigChange('primaryModelName', e.target.value)}
                  placeholder="e.g., Meta-Llama-3-8B-Instruct"
                  className="flex-1"
                />
                
                {detectedModels.length > 0 && (
                  <Select
                    value={detectedModels.includes(config.primaryModelName) ? config.primaryModelName : ''}
                    onValueChange={(value) => handleConfigChange('primaryModelName', value)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Detected models" />
                    </SelectTrigger>
                    <SelectContent>
                      {detectedModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Used for detailed responses. Should match the model name in LM Studio.
              </p>
              
              {!detectedModels.length && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {modelPresets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigChange('primaryModelName', preset.value)}
                      className={
                        config.primaryModelName === preset.value
                          ? 'border-primary bg-primary/10'
                          : ''
                      }
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="secondaryModel">Secondary Model (Fast)</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryModel"
                  value={config.secondaryModelName}
                  onChange={(e) => handleConfigChange('secondaryModelName', e.target.value)}
                  placeholder="e.g., Phi-3-mini-4k-instruct"
                  className="flex-1"
                />
                
                {detectedModels.length > 0 && (
                  <Select
                    value={detectedModels.includes(config.secondaryModelName) ? config.secondaryModelName : ''}
                    onValueChange={(value) => handleConfigChange('secondaryModelName', value)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Detected models" />
                    </SelectTrigger>
                    <SelectContent>
                      {detectedModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Used for quick responses. Should be a faster, smaller model.
              </p>
            </div>
            
            <Separator />
            
            <div className="grid gap-2">
              <Label htmlFor="embeddingModel">Embedding Model</Label>
              <Select
                value={config.embeddingModelName}
                onValueChange={(value) => handleConfigChange('embeddingModelName', value)}
              >
                <SelectTrigger id="embeddingModel">
                  <SelectValue placeholder="Select embedding model" />
                </SelectTrigger>
                <SelectContent>
                  {embeddingModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for generating embeddings and finding similar notes
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Generation Parameters</h3>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Temperature: {config.temperature.toFixed(2)}</Label>
                <span className="text-xs text-muted-foreground">
                  {config.temperature < 0.4 ? 'More deterministic' : 
                   config.temperature > 0.8 ? 'More creative' : 'Balanced'}
                </span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.05}
                value={[config.temperature]}
                onValueChange={(values) => handleConfigChange('temperature', values[0])}
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness in output. Lower values are more deterministic, higher values more creative.
              </p>
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="topP">Top-P: {config.topP.toFixed(2)}</Label>
              </div>
              <Slider
                id="topP"
                min={0.1}
                max={1}
                step={0.05}
                value={[config.topP]}
                onValueChange={(values) => handleConfigChange('topP', values[0])}
              />
              <p className="text-xs text-muted-foreground">
                Controls diversity via nucleus sampling
              </p>
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="maxTokens">Max Tokens: {config.maxTokens}</Label>
              </div>
              <Slider
                id="maxTokens"
                min={256}
                max={4096}
                step={256}
                value={[config.maxTokens]}
                onValueChange={(values) => handleConfigChange('maxTokens', values[0])}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="useVision">Enable Vision Support</Label>
              <p className="text-xs text-muted-foreground">
                Allow models to process images when supported
              </p>
            </div>
            <Switch
              id="useVision"
              checked={config.useVision}
              onCheckedChange={(checked) => handleConfigChange('useVision', checked)}
            />
          </div>
          
          {config.useVision && (
            <div className="flex gap-2 p-3 rounded-md bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Vision Support Information</p>
                <p className="text-xs mt-1">
                  Vision capabilities require a model that supports image processing. 
                  Make sure your selected model includes this capability.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
            >
              Reset to Defaults
            </Button>
            
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setConfig(initialConfig)}
                disabled={!hasChanges}
              >
                Cancel
              </Button>
              
              <Button
                onClick={saveChanges}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelSettings;
