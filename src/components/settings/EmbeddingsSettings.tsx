import { useState, useEffect } from 'react';
import { useEmbeddings } from '@/hooks/useEmbeddings';
import { useNotes } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Brain, 
  Zap, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  InfoIcon
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// List of available embedding models
const AVAILABLE_MODELS = [
  {
    name: 'Xenova/all-MiniLM-L6-v2',
    label: 'MiniLM-L6 (Default)',
    description: 'Fast, lightweight model with good performance (384 dimensions)'
  },
  {
    name: 'Xenova/all-mpnet-base-v2',
    label: 'MPNet Base',
    description: 'Higher accuracy but slower (768 dimensions)'
  },
  {
    name: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    label: 'Multilingual MiniLM',
    description: 'Support for 50+ languages (384 dimensions)'
  }
];

/**
 * Component for managing embedding settings and generation
 */
const EmbeddingsSettings = () => {
  const { 
    modelName, 
    changeEmbeddingModel, 
    processAllContent, 
    isInitialized,
    isInitializing, 
    isProcessing, 
    progress, 
    statusMessage,
    totalItems,
    processedItems,
    serviceError
  } = useEmbeddings();
  
  const { notes } = useNotes();
  const [selectedModel, setSelectedModel] = useState(modelName);
  
  // Calculate embedding statistics
  const notesWithEmbeddings = notes.filter(note => note.embeddings && note.embeddings.length > 0);
  const embeddingCoverage = notes.length > 0 
    ? Math.round((notesWithEmbeddings.length / notes.length) * 100)
    : 0;
  
  // Update selected model when modelName changes
  useEffect(() => {
    setSelectedModel(modelName);
  }, [modelName]);
  
  // Handle model change
  const handleModelChange = async (newModel: string) => {
    if (newModel !== selectedModel) {
      setSelectedModel(newModel);
      await changeEmbeddingModel(newModel);
    }
  };
  
  // Start embedding generation process
  const handleProcessContent = async () => {
    await processAllContent();
  };
  
  // Format status message for display
  const formatStatusMessage = (message: string) => {
    if (message.includes('initializing') || message.includes('loading')) {
      return `${message}`;
    } else if (message.includes('success')) {
      return `✓ ${message}`;
    } else {
      return message;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            Embedding Model Settings
          </CardTitle>
          <CardDescription>
            Configure the embedding model used for similarity detection and content organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Status */}
          <div className="space-y-2">
            <Label className="text-sm">Current Model Status</Label>
            <div className="flex items-center space-x-2">
              {isInitialized ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-600/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span>Initialized</span>
                </Badge>
              ) : isInitializing ? (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-600/20">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  <span>Initializing...</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600/20">
                  <InfoIcon className="h-3 w-3 mr-1" />
                  <span>Not Initialized</span>
                </Badge>
              )}
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" />
                <span>Using Workers</span>
              </Badge>
            </div>
            
            {statusMessage && (
              <p className="text-xs text-muted-foreground">
                {formatStatusMessage(statusMessage)}
              </p>
            )}
            
            {serviceError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Service Error</AlertTitle>
                <AlertDescription className="text-xs">
                  {serviceError}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* Model Selection */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="model-select">Embedding Model</Label>
            <Select 
              value={selectedModel} 
              onValueChange={handleModelChange}
              disabled={isInitializing || isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Available Models</SelectLabel>
                  {AVAILABLE_MODELS.map(model => (
                    <SelectItem 
                      key={model.name} 
                      value={model.name}
                      className="flex flex-col items-start"
                    >
                      <div className="font-medium">{model.label}</div>
                      <div className="text-xs text-muted-foreground">{model.description}</div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <p className="text-xs text-muted-foreground">
              The selected model is used to generate vector embeddings for similarity detection.
              Changing the model requires regenerating all embeddings.
            </p>
          </div>
          
          <Separator className="my-4" />
          
          {/* Embedding Statistics */}
          <div className="space-y-2">
            <Label className="text-sm">Embedding Coverage</Label>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-md bg-muted">
                <p className="text-2xl font-bold">{notesWithEmbeddings.length}</p>
                <p className="text-xs text-muted-foreground">Notes with Embeddings</p>
              </div>
              <div className="p-2 rounded-md bg-muted">
                <p className="text-2xl font-bold">{notes.length - notesWithEmbeddings.length}</p>
                <p className="text-xs text-muted-foreground">Notes without Embeddings</p>
              </div>
              <div className="p-2 rounded-md bg-muted">
                <p className="text-2xl font-bold">{embeddingCoverage}%</p>
                <p className="text-xs text-muted-foreground">Coverage</p>
              </div>
            </div>
          </div>
          
          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Processing embeddings...</span>
                <span>{processedItems} of {totalItems}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                This might take a few minutes. You can continue using the app during processing.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="text-sm text-muted-foreground">
            <InfoIcon className="h-4 w-4 inline-block mr-1" />
            <span>
              Embeddings are stored locally and never sent to external servers.
            </span>
          </div>
          <Button
            onClick={handleProcessContent}
            disabled={isProcessing || isInitializing || !isInitialized}
            className="ml-auto"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate Embeddings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmbeddingsSettings;
