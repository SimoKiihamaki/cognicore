/**
 * Semantic Search Component
 * 
 * Provides a search interface that uses embeddings for semantic similarity
 * rather than just keyword matching.
 */

import React, { useState, useEffect } from 'react';
import { useEmbeddings, EmbeddingProgress } from '@/hooks/useEmbeddings';
import { SimilarityResult } from '@/services/embedding/embeddingService';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, FileText, FileIcon, LayoutGrid, LayoutList, Settings } from 'lucide-react';

export interface SemanticSearchProps {
  onResultSelected?: (result: SimilarityResult) => void;
}

export function SemanticSearch({ onResultSelected }: SemanticSearchProps) {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.6);
  const [maxResults, setMaxResults] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const { 
    isInitialized, 
    isInitializing,
    isProcessing, 
    progress,
    error,
    initialize,
    semanticSearch 
  } = useEmbeddings();

  // Initialize embedding service
  useEffect(() => {
    const initEmbeddings = async () => {
      if (!isInitialized && !isInitializing) {
        await initialize();
      }
    };
    
    initEmbeddings();
  }, [isInitialized, isInitializing, initialize]);

  // Handle search
  const handleSearch = async () => {
    if (!query.trim() || isProcessing) return;
    
    try {
      const searchResults = await semanticSearch(query.trim(), similarityThreshold, maxResults);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle pressing Enter in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Render progress information
  const renderProgress = (progress: EmbeddingProgress) => (
    <div className="mt-4">
      <div className="flex justify-between text-sm mb-1">
        <span>{progress.message}</span>
        <span>{progress.percentage.toFixed(0)}%</span>
      </div>
      <Progress value={progress.percentage * 100} className="h-2" />
    </div>
  );

  // Render search settings
  const renderSettings = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Search Settings</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSettings(false)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Adjust parameters to fine-tune your semantic search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Similarity Threshold: {similarityThreshold.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">
              {similarityThreshold < 0.5 ? 'More Results' : similarityThreshold > 0.7 ? 'Higher Relevance' : 'Balanced'}
            </span>
          </div>
          <Slider 
            value={[similarityThreshold]} 
            min={0.3} 
            max={0.9} 
            step={0.05}
            onValueChange={([value]) => setSimilarityThreshold(value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Maximum Results: {maxResults}</span>
          </div>
          <Slider 
            value={[maxResults]} 
            min={5} 
            max={30} 
            step={5}
            onValueChange={([value]) => setMaxResults(value)}
          />
        </div>
      </CardContent>
    </Card>
  );

  // Render search results in grid mode
  const renderGridResults = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {results.map((result) => (
        <Card
          key={result.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onResultSelected && onResultSelected(result)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {result.type === 'note' ? (
                <FileText className="h-4 w-4 text-primary" />
              ) : (
                <FileIcon className="h-4 w-4 text-primary" />
              )}
              <CardTitle className="text-base truncate">{result.title}</CardTitle>
            </div>
            <div className="flex justify-between items-center mt-1">
              <Badge variant="outline">{result.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {(result.similarity * 100).toFixed(0)}% Match
              </span>
            </div>
          </CardHeader>
          {result.chunkText && (
            <CardContent className="pb-3 pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {result.chunkText}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );

  // Render search results in list mode
  const renderListResults = () => (
    <div className="space-y-3 mt-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onResultSelected && onResultSelected(result)}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {result.type === 'note' ? (
                <FileText className="h-4 w-4 text-primary" />
              ) : (
                <FileIcon className="h-4 w-4 text-primary" />
              )}
              <h3 className="font-medium">{result.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{result.type}</Badge>
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {(result.similarity * 100).toFixed(0)}% Match
              </span>
            </div>
          </div>
          {result.chunkText && (
            <>
              <Separator className="my-2" />
              <p className="text-sm text-muted-foreground line-clamp-2">
                {result.chunkText}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by meaning, not just keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-8"
            disabled={isProcessing || isInitializing}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isProcessing || isInitializing || !query.trim()}
        >
          Search
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {showSettings && renderSettings()}
      
      {isInitializing && (
        <div className="p-4 bg-muted rounded-md">
          <p className="text-sm mb-2">Initializing embedding model...</p>
          <Progress value={30} className="h-2" />
        </div>
      )}
      
      {isProcessing && progress && renderProgress(progress)}
      
      {error && (
        <div className="p-4 bg-destructive/20 rounded-md text-destructive">
          <p className="text-sm font-medium">Error: {error}</p>
        </div>
      )}
      
      {results.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {results.length} {results.length === 1 ? 'Result' : 'Results'}
            </h2>
            <div className="space-x-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {viewMode === 'grid' ? renderGridResults() : renderListResults()}
        </div>
      )}
      
      {results.length === 0 && query && !isProcessing && !isInitializing && (
        <div className="p-8 text-center text-muted-foreground">
          <Search className="mx-auto h-8 w-8 mb-2" />
          <p>No results found. Try a different search or adjust your settings.</p>
        </div>
      )}
    </div>
  );
}
