import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { initializeLMStudioService, getLMStudioService, LMStudioError, LMStudioErrorType } from '@/api/lmStudioApi';
import { ServerCog, RotateCcw, Loader2, Check, Brain, Command, Settings, History, FastForward, AlertCircle } from 'lucide-react';
import SettingsHeader from './SettingsHeader';
import SettingsSectionContainer from './SettingsSectionContainer';

// Model preset types
interface ModelPreset {
  name: string;
  modelName: string;
  contextLength: number;
  description: string;
  category: 'open' | 'proprietary';
  tags: string[];
  recommendedSettings?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
  };
}

// Open-source model presets
const openSourceModelPresets: ModelPreset[] = [
  {
    name: "Llama 3 8B Instruct",
    modelName: "Meta-Llama-3-8B-Instruct",
    contextLength: 8192,
    description: "Meta's 8B parameter compact but capable instruction-tuned model",
    category: "open",
    tags: ["conversational", "instruction-tuned", "general-purpose"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024
    }
  },
  {
    name: "Llama 3 70B Instruct",
    modelName: "Meta-Llama-3-70B-Instruct",
    contextLength: 8192,
    description: "Meta's 70B parameter high-performance instruction-tuned model",
    category: "open",
    tags: ["conversational", "instruction-tuned", "high-quality", "high-performance"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 2048
    }
  },
  {
    name: "Phi-3 Mini 4K Instruct",
    modelName: "Phi-3-mini-4k-instruct",
    contextLength: 4096,
    description: "Microsoft's compact but powerful model optimized for instruction following",
    category: "open",
    tags: ["compact", "efficient", "instruction-tuned"],
    recommendedSettings: {
      temperature: 0.8,
      topP: 0.9,
      maxTokens: 512
    }
  },
  {
    name: "Mistral 7B Instruct v0.2",
    modelName: "Mistral-7B-Instruct-v0.2",
    contextLength: 8192,
    description: "Mistral AI's instruction-tuned 7B parameter model",
    category: "open",
    tags: ["efficient", "instruction-tuned", "general-purpose"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024
    }
  },
  {
    name: "Mistral Large",
    modelName: "Mistral-Large-2-latest",
    contextLength: 32768,
    description: "Mistral AI's high-performance large model",
    category: "open",
    tags: ["high-performance", "instruction-tuned", "long-context"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048
    }
  },
  {
    name: "Mixtral 8x7B Instruct v0.1",
    modelName: "Mixtral-8x7B-Instruct-v0.1",
    contextLength: 32768,
    description: "Mistral AI's mixture-of-experts model with 8 experts",
    category: "open",
    tags: ["high-performance", "instruction-tuned", "mixture-of-experts"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048
    }
  },
  {
    name: "Dolphin 2.9 Mistral 7B",
    modelName: "dolphin-2.9-mistral-7b",
    contextLength: 8192,
    description: "Dolphin fine-tuned version of Mistral 7B",
    category: "open",
    tags: ["conversational", "instruction-tuned", "fine-tuned"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024
    }
  }
];

// Proprietary model presets for API mode
const proprietaryModelPresets: ModelPreset[] = [
  {
    name: "GPT-4o",
    modelName: "gpt-4o",
    contextLength: 128000,
    description: "OpenAI's most advanced multimodal model with omni capabilities",
    category: "proprietary",
    tags: ["multimodal", "high-performance", "high-quality"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 2048
    }
  },
  {
    name: "GPT-4 Turbo",
    modelName: "gpt-4-turbo",
    contextLength: 128000,
    description: "OpenAI's optimized version of GPT-4 with long context",
    category: "proprietary",
    tags: ["high-performance", "high-quality", "long-context"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 2048
    }
  },
  {
    name: "GPT-3.5 Turbo",
    modelName: "gpt-3.5-turbo",
    contextLength: 16384,
    description: "OpenAI's efficient model with good performance and lower cost",
    category: "proprietary",
    tags: ["efficient", "fast", "cost-effective"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024
    }
  },
  {
    name: "Claude 3 Opus",
    modelName: "claude-3-opus-20240229",
    contextLength: 200000,
    description: "Anthropic's most powerful model with extensive reasoning capabilities",
    category: "proprietary",
    tags: ["high-performance", "reasoning", "long-context"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048
    }
  },
  {
    name: "Claude 3 Sonnet",
    modelName: "claude-3-sonnet-20240229",
    contextLength: 200000,
    description: "Anthropic's balanced model with good performance and efficiency",
    category: "proprietary",
    tags: ["balanced", "efficient", "long-context"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024
    }
  },
  {
    name: "Claude 3 Haiku",
    modelName: "claude-3-haiku-20240307",
    contextLength: 200000,
    description: "Anthropic's fastest Claude model optimized for responsiveness",
    category: "proprietary",
    tags: ["fast", "efficient", "responsive"],
    recommendedSettings: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 512
    }
  }
];

// Common embedding model presets
const embeddingModelPresets = [
  {
    name: "MiniLM (Default)",
    modelName: "Xenova/all-MiniLM-L6-v2",
    description: "Fast and efficient general-purpose embedding model"
  },
  {
    name: "E5 Small",
    modelName: "Xenova/e5-small-v2",
    description: "Improved semantic search embeddings with good performance"
  },
  {
    name: "MiniLM Large",
    modelName: "Xenova/all-MiniLM-L12-v2",
    description: "Larger version with better representation quality"
  },
  {
    name: "Multilingual MiniLM",
    modelName: "Xenova/multilingual-e5-small",
    description: "Supports multiple languages with good cross-lingual capabilities"
  }
];

interface LMStudioConfig {
  baseUrl: string;
  apiKey: string;
  primaryModelName: string;
  secondaryModelName: string;
  embeddingModelName: string;
  connectionMode: 'local' | 'api';
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  useVision: boolean;
}

// Default configuration
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
  useVision: true
};

const LMStudioSettings = () => {
  // State for configuration
  const [config, setConfig] = useLocalStorage<LMStudioConfig>('lmStudio-config', defaultConfig);
  
  // State for UI
  const [activeTab, setActiveTab] = useState('connection');
  const [testingConnection, setTestingConnection] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [detectedModels, setDetectedModels] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');

  // Fetch available models from LM Studio
  const fetchAvailableModels = async () => {
    if (!config.baseUrl) return;
    
    try {
      setTestingConnection(true);
      
      // Initialize LM Studio service
      const service = initializeLMStudioService({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        primaryModelName: config.primaryModelName,
        secondaryModelName: config.secondaryModelName
      });
      
      // Test connection
      const isConnected = await service.testConnection();
      
      if (!isConnected) {
        setConnectionStatus('error');
        setDetectedModels(false);
        toast.error("Failed to connect to LM Studio", {
          description: "Unable to detect available models. Check your connection settings."
        });
        return;
      }
      
      setConnectionStatus('success');
      
      // Try to fetch model list (this is experimental and depends on LM Studio's API)
      try {
        const response = await fetch(`${config.baseUrl}/v1/models`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            const modelNames = data.data.map((model: any) => model.id || model.name);
            setAvailableModels(modelNames);
            setDetectedModels(true);
            toast.success("Models detected successfully", {
              description: `Found ${modelNames.length} available models.`
            });
          }
        }
      } catch (error) {
        console.log("Unable to fetch models list:", error);
        // This is expected to fail in many LM Studio configurations, so we don't show an error
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus('error');
      setDetectedModels(false);
      
      let errorMessage = "Unknown error occurred";
      let errorTitle = "Connection failed";
      
      if (error instanceof LMStudioError) {
        errorMessage = error.getUserMessage();
        
        switch (error.type) {
          case LMStudioErrorType.CONNECTION:
            errorTitle = "Connection failed";
            errorMessage = `Could not connect to ${config.baseUrl}. Is LM Studio running?`;
            break;
          case LMStudioErrorType.AUTHENTICATION:
            errorTitle = "Authentication failed";
            errorMessage = "Invalid API key or authentication issue.";
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorTitle, {
        description: errorMessage
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle input changes
  const handleChange = (field: keyof LMStudioConfig, value: any) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      [field]: value
    }));
    
    // Reset selected preset when changing models
    if (['primaryModelName', 'secondaryModelName'].includes(field)) {
      setSelectedPreset(null);
    }
  };

  // Apply preset settings
  const applyPreset = (preset: ModelPreset) => {
    // Only apply relevant fields from preset
    const { modelName, recommendedSettings } = preset;
    
    const updates: Partial<LMStudioConfig> = {
      primaryModelName: modelName
    };
    
    if (recommendedSettings) {
      if (recommendedSettings.temperature !== undefined) {
        updates.temperature = recommendedSettings.temperature;
      }
      
      if (recommendedSettings.topP !== undefined) {
        updates.topP = recommendedSettings.topP;
      }
      
      if (recommendedSettings.topK !== undefined) {
        updates.topK = recommendedSettings.topK;
      }
      
      if (recommendedSettings.maxTokens !== undefined) {
        updates.maxTokens = recommendedSettings.maxTokens;
      }
    }
    
    setConfig(prevConfig => ({
      ...prevConfig,
      ...updates
    }));
    
    setSelectedPreset(preset.name);
    
    toast.success("Model preset applied", {
      description: `Applied ${preset.name} preset with recommended settings.`
    });
  };

  // Apply embedding model preset
  const applyEmbeddingPreset = (preset: { name: string, modelName: string }) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      embeddingModelName: preset.modelName
    }));
    
    toast.success("Embedding model changed", {
      description: `Changed to ${preset.name}.`
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setConfig(defaultConfig);
    setSelectedPreset(null);
    
    toast.success("Settings reset", {
      description: "All LM Studio settings have been reset to default values."
    });
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="LM Studio Settings"
        description="Configure your connection to LM Studio and manage model settings"
        icon={<Brain className="h-5 w-5" />}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection" className="space-y-6 pt-4">
          <SettingsSectionContainer 
            title="Connection Mode" 
            description="Choose how to connect to your language models"
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`border cursor-pointer transition hover:shadow-md ${
                    config.connectionMode === 'local' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleChange('connectionMode', 'local')}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <ServerCog className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Local Server</h3>
                      </div>
                      {config.connectionMode === 'local' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect to a locally running LM Studio instance on your computer
                    </p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`border cursor-pointer transition hover:shadow-md ${
                    config.connectionMode === 'api' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleChange('connectionMode', 'api')}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">API Mode</h3>
                      </div>
                      {config.connectionMode === 'api' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Connect to OpenAI-compatible APIs (OpenAI, Claude, etc.)
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer 
            title="Connection Settings" 
            description={
              config.connectionMode === 'local' 
                ? "Configure your local LM Studio connection" 
                : "Configure API connection settings"
            }
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="baseUrl">
                  {config.connectionMode === 'local' ? 'LM Studio URL' : 'API Endpoint'}
                </Label>
                <Input
                  id="baseUrl"
                  value={config.baseUrl}
                  onChange={(e) => handleChange('baseUrl', e.target.value)}
                  placeholder={
                    config.connectionMode === 'local' 
                      ? "http://localhost:1234" 
                      : "https://api.openai.com"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {config.connectionMode === 'local' 
                    ? "The base URL of your local LM Studio installation (usually http://localhost:1234)" 
                    : "The base URL for the API (e.g., https://api.openai.com for OpenAI)"}
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder={
                    config.connectionMode === 'local' 
                      ? "Usually not required for local LM Studio" 
                      : "sk-..."
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {config.connectionMode === 'local' 
                    ? "Only required if your local LM Studio instance is configured to require authentication" 
                    : "Required for API access. Keep this secret and never share it publicly"}
                </p>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'untested' 
                        ? 'bg-gray-400' 
                        : connectionStatus === 'success' 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {connectionStatus === 'untested' 
                      ? 'Connection not tested' 
                      : connectionStatus === 'success' 
                      ? 'Connected successfully' 
                      : 'Connection failed'}
                  </span>
                </div>
                
                <Button 
                  onClick={fetchAvailableModels}
                  disabled={testingConnection}
                  variant="outline"
                  size="sm"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer
            title="Multimodal Support"
            description="Configure support for images and other multimodal capabilities"
          >
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useVision">Enable Vision Support</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the model to process and respond to images
                  </p>
                </div>
                <Switch
                  id="useVision"
                  checked={config.useVision}
                  onCheckedChange={(checked) => handleChange('useVision', checked)}
                />
              </div>
              
              {config.useVision && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                  <div className="flex gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Vision support requires a compatible model</p>
                      <p className="text-amber-600/80 mt-1">
                        Make sure your selected model supports vision capabilities or disable this option.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SettingsSectionContainer>
        </TabsContent>
        
        <TabsContent value="models" className="space-y-6 pt-4">
          <SettingsSectionContainer 
            title="Primary Model" 
            description="Select your main model for comprehensive responses"
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="primaryModel">Model Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryModel"
                    value={config.primaryModelName}
                    onChange={(e) => handleChange('primaryModelName', e.target.value)}
                    placeholder="e.g., Meta-Llama-3-8B-Instruct"
                    className="flex-1"
                  />
                  
                  {detectedModels && availableModels.length > 0 && (
                    <Select 
                      value={availableModels.includes(config.primaryModelName) ? config.primaryModelName : ''} 
                      onValueChange={(value) => handleChange('primaryModelName', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Detected models" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for detailed interactions. Should match exactly the model name in LM Studio.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label>Model Presets</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {(config.connectionMode === 'local' ? openSourceModelPresets : [...openSourceModelPresets, ...proprietaryModelPresets])
                    .map((preset) => (
                    <Card 
                      key={preset.name}
                      className={`border cursor-pointer transition-colors hover:border-primary ${
                        selectedPreset === preset.name ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => applyPreset(preset)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{preset.modelName}</div>
                            <div className="flex gap-1 mt-2">
                              {preset.tags.slice(0, 2).map(tag => (
                                <span 
                                  key={tag} 
                                  className="inline-block px-2 py-0.5 bg-secondary text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          {selectedPreset === preset.name && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer 
            title="Secondary Model" 
            description="Select a faster model for quick responses"
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="secondaryModel">Model Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryModel"
                    value={config.secondaryModelName}
                    onChange={(e) => handleChange('secondaryModelName', e.target.value)}
                    placeholder="e.g., Phi-3-mini-4k-instruct"
                    className="flex-1"
                  />
                  
                  {detectedModels && availableModels.length > 0 && (
                    <Select 
                      value={availableModels.includes(config.secondaryModelName) ? config.secondaryModelName : ''} 
                      onValueChange={(value) => handleChange('secondaryModelName', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Detected models" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for quick tasks. Should be a faster, lighter model for better responsiveness.
                </p>
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer 
            title="Embedding Model" 
            description="Select the model used for generating note embeddings"
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="embeddingModel">Model Name</Label>
                <Input
                  id="embeddingModel"
                  value={config.embeddingModelName}
                  onChange={(e) => handleChange('embeddingModelName', e.target.value)}
                  placeholder="e.g., Xenova/all-MiniLM-L6-v2"
                />
                <p className="text-xs text-muted-foreground">
                  Used for generating embeddings to calculate note similarity.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label>Embedding Model Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {embeddingModelPresets.map(preset => (
                    <Card 
                      key={preset.modelName}
                      className={`border cursor-pointer transition hover:border-primary ${
                        config.embeddingModelName === preset.modelName ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => applyEmbeddingPreset(preset)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{preset.name}</div>
                            <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                              {preset.modelName}
                            </div>
                          </div>
                          {config.embeddingModelName === preset.modelName && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSectionContainer>
        </TabsContent>
        
        <TabsContent value="parameters" className="space-y-6 pt-4">
          <SettingsSectionContainer 
            title="Generation Parameters" 
            description="Configure how the model generates responses"
          >
            <div className="grid gap-6">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">Temperature: {config.temperature.toFixed(2)}</Label>
                  <span className="text-sm text-muted-foreground">
                    {config.temperature < 0.3 ? 'More deterministic' : 
                     config.temperature > 0.8 ? 'More creative' : 'Balanced'}
                  </span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.01}
                  value={[config.temperature]}
                  onValueChange={(values) => handleChange('temperature', values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Controls randomness. Lower values make output more deterministic,
                  higher values make it more creative.
                </p>
              </div>
              
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="topP">Top-P: {config.topP.toFixed(2)}</Label>
                  <span className="text-sm text-muted-foreground">
                    {config.topP < 0.5 ? 'More focused' : 
                     config.topP > 0.9 ? 'More diverse' : 'Balanced'}
                  </span>
                </div>
                <Slider
                  id="topP"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[config.topP]}
                  onValueChange={(values) => handleChange('topP', values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Controls diversity via nucleus sampling. Only tokens with top cumulative probability up
                  to topP are considered.
                </p>
              </div>
              
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="topK">Top-K: {config.topK}</Label>
                </div>
                <Slider
                  id="topK"
                  min={1}
                  max={100}
                  step={1}
                  value={[config.topK]}
                  onValueChange={(values) => handleChange('topK', values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Limits token selection to the top K options. Often used in conjunction with temperature and top-P.
                </p>
              </div>
              
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="maxTokens">Max Tokens: {config.maxTokens}</Label>
                </div>
                <Slider
                  id="maxTokens"
                  min={64}
                  max={4096}
                  step={64}
                  value={[config.maxTokens]}
                  onValueChange={(values) => handleChange('maxTokens', values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of tokens to generate. Higher values allow for longer responses.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={resetToDefaults}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer 
            title="Advanced Settings" 
            description="Additional configuration for fine-tuning model behavior"
          >
            <div className="grid gap-4">
              <div className="rounded-md bg-muted/50 p-4">
                <div className="flex items-start gap-2">
                  <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">System Prompts</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      System prompts and additional parameters will be configurable in a future update.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSectionContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Function to manage missing imports
const Globe = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// Safer export to prevent rendering issues
export { LMStudioSettings as default };