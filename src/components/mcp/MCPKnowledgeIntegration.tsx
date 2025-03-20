import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotes } from '@/hooks/useNotes';
import { useEmbeddings } from '@/hooks/useEmbeddings';
import { MCPServer, MCPQueryResult, getActiveMCPService } from '@/api/mcpApi';
import { useFolders } from '@/hooks/useFolders';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowDownToLine,
  Brain,
  Database,
  FileQuestion,
  Network,
  Search,
  Settings2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Note } from '@/lib/types';

interface ImportOptions {
  importAsNotes: boolean;
  targetFolderId: string;
  includeMetadata: boolean;
  similarityThreshold: number;
  maxResults: number;
  autoIntegrate: boolean;
}

interface QueryState {
  query: string;
  isLoading: boolean;
  results: MCPQueryResult[];
  error: string | null;
  selectedItems: string[];
}

/**
 * Component for integrating knowledge from MCP servers into the application
 */
const MCPKnowledgeIntegration = () => {
  const { toast } = useToast();
  const { addNote, updateNote } = useNotes();
  const { generateNoteEmbeddings } = useEmbeddings();
  const { folderTree, addFolder } = useFolders();
  const [servers, setServers] = useLocalStorage<MCPServer[]>('mcp-servers', []);
  const [importOptions, setImportOptions] = useLocalStorage<ImportOptions>('mcp-import-options', {
    importAsNotes: true,
    targetFolderId: '',
    includeMetadata: true,
    similarityThreshold: 0.3,
    maxResults: 10,
    autoIntegrate: false,
  });
  
  const [queryState, setQueryState] = useState<QueryState>({
    query: '',
    isLoading: false,
    results: [],
    error: null,
    selectedItems: [],
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [integrationProgress, setIntegrationProgress] = useState({
    isIntegrating: false,
    current: 0,
    total: 0,
    errorCount: 0,
  });
  
  // Get the active MCP service
  const mcpService = getActiveMCPService(servers);
  const isConnected = !!mcpService;
  
  // Check if there's at least one server configured
  useEffect(() => {
    if (servers.length === 0) {
      toast({
        title: "MCP Server Required",
        description: "Please configure an MCP server in the Server Configuration section.",
        variant: "destructive",
      });
    }
  }, [servers.length, toast]);
  
  // Create a default folder for MCP content if none exists
  useEffect(() => {
    if (folderTree.length === 0) {
      // Create a default folder for MCP content
      const mcpFolderId = addFolder("MCP Knowledge", null);
      
      // Update import options with the new folder ID
      setImportOptions(prev => ({
        ...prev,
        targetFolderId: mcpFolderId,
      }));
    } else if (!importOptions.targetFolderId) {
      // Set the first folder as default if none is selected
      setImportOptions(prev => ({
        ...prev,
        targetFolderId: folderTree[0].id,
      }));
    }
  }, [folderTree, addFolder, importOptions.targetFolderId, setImportOptions]);
  
  /**
   * Search the MCP server for content matching the query
   */
  const searchMCPKnowledge = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: "No Active MCP Server",
        description: "Please select an active MCP server in the Server Configuration section.",
        variant: "destructive",
      });
      return;
    }
    
    if (!queryState.query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }
    
    setQueryState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await mcpService!.queryKnowledge(queryState.query.trim(), {
        includeMetadata: importOptions.includeMetadata,
        maxResults: importOptions.maxResults,
        similarityThreshold: importOptions.similarityThreshold,
      });
      
      setQueryState(prev => ({
        ...prev,
        isLoading: false,
        results: response.results,
        selectedItems: importOptions.autoIntegrate ? response.results.map(r => r.id) : [],
      }));
      
      if (response.results.length === 0) {
        toast({
          title: "No Results Found",
          description: "Your query did not match any documents in the knowledge base.",
        });
      } else if (importOptions.autoIntegrate) {
        // If auto-integrate is enabled, automatically import all results
        integrateSelectedItems(response.results.map(r => r.id));
      }
    } catch (error) {
      setQueryState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
      
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : 'Failed to search MCP knowledge base',
        variant: "destructive",
      });
    }
  }, [queryState.query, importOptions, isConnected, mcpService, toast]);
  
  /**
   * Toggle selection of an item in the results
   */
  const toggleItemSelection = useCallback((itemId: string) => {
    setQueryState(prev => {
      const selectedItems = prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId];
      
      return { ...prev, selectedItems };
    });
  }, []);
  
  /**
   * Toggle selection of all items
   */
  const toggleSelectAll = useCallback(() => {
    setQueryState(prev => {
      // If all items are already selected, deselect all
      if (prev.selectedItems.length === prev.results.length) {
        return { ...prev, selectedItems: [] };
      }
      
      // Otherwise, select all
      return { ...prev, selectedItems: prev.results.map(r => r.id) };
    });
  }, []);
  
  /**
   * Integrate selected items into the knowledge base
   */
  const integrateSelectedItems = useCallback(async (itemIds: string[] = queryState.selectedItems) => {
    if (itemIds.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to integrate.",
        variant: "destructive",
      });
      return;
    }
    
    if (!importOptions.targetFolderId) {
      toast({
        title: "Target Folder Required",
        description: "Please select a target folder in the settings.",
        variant: "destructive",
      });
      return;
    }
    
    setIntegrationProgress({
      isIntegrating: true,
      current: 0,
      total: itemIds.length,
      errorCount: 0,
    });
    
    // Get selected items from results
    const selectedItems = queryState.results.filter(item => itemIds.includes(item.id));
    
    // Process items one by one to ensure proper embedding generation
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      
      try {
        // Create note from MCP query result
        const formattedMetadata = item.metadata ? JSON.stringify(item.metadata, null, 2) : '';
        const noteContent = importOptions.includeMetadata && item.metadata
          ? `${item.content}\n\n---\n\n**Source**: ${item.source || 'MCP Knowledge Base'}\n\n**Metadata**:\n\`\`\`json\n${formattedMetadata}\n\`\`\``
          : `${item.content}\n\n---\n\n**Source**: ${item.source || 'MCP Knowledge Base'}`;
        
        const noteId = addNote(
          item.title,
          noteContent,
          importOptions.targetFolderId
        );
        
        // Generate embeddings for the new note
        const note: Note = {
          id: noteId,
          title: item.title,
          content: noteContent,
          folderId: importOptions.targetFolderId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await generateNoteEmbeddings(note);
        
        setIntegrationProgress(prev => ({
          ...prev,
          current: prev.current + 1,
        }));
      } catch (error) {
        console.error(`Error integrating item ${item.id}:`, error);
        
        setIntegrationProgress(prev => ({
          ...prev,
          current: prev.current + 1,
          errorCount: prev.errorCount + 1,
        }));
      }
    }
    
    // Reset progress
    setIntegrationProgress(prev => ({
      ...prev,
      isIntegrating: false,
    }));
    
    toast({
      title: "Integration Complete",
      description: `Successfully integrated ${selectedItems.length - integrationProgress.errorCount} items into your knowledge base.${integrationProgress.errorCount > 0 ? ` (${integrationProgress.errorCount} errors)` : ''}`,
    });
    
    // Clear selection if successful
    if (integrationProgress.errorCount === 0) {
      setQueryState(prev => ({
        ...prev,
        selectedItems: [],
      }));
    }
  }, [queryState.selectedItems, queryState.results, importOptions, addNote, generateNoteEmbeddings, toast]);
  
  // Update import options
  const handleOptionChange = useCallback((key: keyof ImportOptions, value: any) => {
    setImportOptions(prev => ({
      ...prev,
      [key]: value,
    }));
  }, [setImportOptions]);
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg flex items-center">
                <Network className="mr-2 h-5 w-5" />
                MCP Knowledge Integration
              </CardTitle>
              <CardDescription>
                Search and integrate knowledge from connected MCP servers
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              title="Integration Settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Active Server</AlertTitle>
              <AlertDescription>
                Please configure and activate an MCP server in the Server Configuration section.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search knowledge base..."
                    value={queryState.query}
                    onChange={(e) => setQueryState(prev => ({ ...prev, query: e.target.value }))}
                    disabled={queryState.isLoading || integrationProgress.isIntegrating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        searchMCPKnowledge();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={searchMCPKnowledge}
                  disabled={queryState.isLoading || integrationProgress.isIntegrating || !queryState.query.trim()}
                >
                  {queryState.isLoading ? (
                    <>
                      <Search className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {integrationProgress.isIntegrating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Integrating knowledge...</span>
                    <span>{integrationProgress.current} of {integrationProgress.total}</span>
                  </div>
                  <Progress 
                    value={(integrationProgress.current / integrationProgress.total) * 100} 
                    className="h-2" 
                  />
                </div>
              )}

              {queryState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Search Error</AlertTitle>
                  <AlertDescription>
                    {queryState.error}
                  </AlertDescription>
                </Alert>
              )}
              
              {queryState.results.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">
                      {queryState.results.length} Results
                    </h3>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={queryState.selectedItems.length === queryState.results.length && queryState.results.length > 0}
                        onCheckedChange={toggleSelectAll}
                        disabled={integrationProgress.isIntegrating}
                      />
                      <Label htmlFor="select-all" className="text-xs">Select All</Label>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-4">
                      {queryState.results.map(result => (
                        <div
                          key={result.id}
                          className={`p-3 rounded-md ${
                            queryState.selectedItems.includes(result.id)
                              ? 'bg-primary/10 border-primary/20'
                              : 'bg-muted/40 border-muted/30'
                          } border transition-colors`}
                        >
                          <div className="flex items-start">
                            <Checkbox
                              id={`select-${result.id}`}
                              checked={queryState.selectedItems.includes(result.id)}
                              onCheckedChange={() => toggleItemSelection(result.id)}
                              className="mt-1 mr-2"
                              disabled={integrationProgress.isIntegrating}
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium line-clamp-1">{result.title}</h4>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {Math.round(result.similarity * 100)}% match
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {result.content}
                              </p>
                              {result.source && (
                                <p className="text-xs text-muted-foreground">
                                  Source: {result.source}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setQueryState(prev => ({ ...prev, results: [], selectedItems: [] }))}
                      disabled={integrationProgress.isIntegrating}
                    >
                      Clear Results
                    </Button>
                    <Button
                      onClick={() => integrateSelectedItems()}
                      disabled={queryState.selectedItems.length === 0 || integrationProgress.isIntegrating}
                    >
                      <ArrowDownToLine className="mr-2 h-4 w-4" />
                      {integrationProgress.isIntegrating
                        ? `Integrating (${integrationProgress.current}/${integrationProgress.total})`
                        : `Integrate (${queryState.selectedItems.length})`}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        {isConnected && (
          <CardFooter className="pt-0 text-xs text-muted-foreground">
            <div className="flex items-center">
              <Database className="mr-1 h-3 w-3" />
              Connected to: {servers.find(s => s.isActive)?.name}
            </div>
          </CardFooter>
        )}
      </Card>
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Knowledge Integration Settings</DialogTitle>
            <DialogDescription>
              Configure how knowledge from MCP servers is integrated into your notes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoIntegrate">Auto-Integrate Results</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically integrate all search results
                </p>
              </div>
              <Switch
                id="autoIntegrate"
                checked={importOptions.autoIntegrate}
                onCheckedChange={(checked) => handleOptionChange('autoIntegrate', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="targetFolder">Target Folder</Label>
              <Select
                value={importOptions.targetFolderId}
                onValueChange={(value) => handleOptionChange('targetFolderId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target folder" />
                </SelectTrigger>
                <SelectContent>
                  {folderTree.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Integrated knowledge will be saved as notes in this folder
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeMetadata">Include Metadata</Label>
                <p className="text-xs text-muted-foreground">
                  Include source and metadata in integrated notes
                </p>
              </div>
              <Switch
                id="includeMetadata"
                checked={importOptions.includeMetadata}
                onCheckedChange={(checked) => handleOptionChange('includeMetadata', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="similarityThreshold">Similarity Threshold ({importOptions.similarityThreshold.toFixed(2)})</Label>
              <Input
                id="similarityThreshold"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={importOptions.similarityThreshold}
                onChange={(e) => handleOptionChange('similarityThreshold', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Minimum similarity score for search results (0-1)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxResults">Maximum Results</Label>
              <Input
                id="maxResults"
                type="number"
                min="1"
                max="50"
                value={importOptions.maxResults}
                onChange={(e) => handleOptionChange('maxResults', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of search results to return
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCPKnowledgeIntegration;
