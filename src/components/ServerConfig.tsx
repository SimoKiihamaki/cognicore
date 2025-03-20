
import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Edit, ServerCog, Globe, Check, Loader2, Info } from 'lucide-react';
import { MCPServer, getMCPService } from '@/api/mcpApi';
import { initializeLMStudioService, LMStudioError, LMStudioErrorType } from '@/api/lmStudioApi';

const ServerConfig = () => {
  const [servers, setServers] = useLocalStorage<MCPServer[]>('mcp-servers', []);
  const [lmStudioConfig, setLmStudioConfig] = useLocalStorage('lmStudio-config', {
    baseUrl: 'http://localhost:1234',
    apiKey: '',
    primaryModelName: 'llama3',
    secondaryModelName: 'phi3'
  });
  
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [isEditServerOpen, setIsEditServerOpen] = useState(false);
  const [isDeleteServerOpen, setIsDeleteServerOpen] = useState(false);
  const [isLmStudioOpen, setIsLmStudioOpen] = useState(false);
  const [currentServer, setCurrentServer] = useState<MCPServer | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [serverForm, setServerForm] = useState({
    name: '',
    url: '',
    apiKey: ''
  });
  const [lmStudioForm, setLmStudioForm] = useState({
    baseUrl: lmStudioConfig.baseUrl,
    apiKey: lmStudioConfig.apiKey,
    primaryModelName: lmStudioConfig.primaryModelName,
    secondaryModelName: lmStudioConfig.secondaryModelName
  });
  
  const { toast } = useToast();

  // Initialize LM Studio service when config changes
  useEffect(() => {
    try {
      initializeLMStudioService(lmStudioConfig);
    } catch (error) {
      console.error('Failed to initialize LM Studio service:', error);
    }
  }, [lmStudioConfig]);

  const handleAddServer = () => {
    setServerForm({
      name: '',
      url: '',
      apiKey: ''
    });
    setIsAddServerOpen(true);
  };

  const handleEditServer = (server: MCPServer) => {
    setCurrentServer(server);
    setServerForm({
      name: server.name,
      url: server.url,
      apiKey: server.apiKey
    });
    setIsEditServerOpen(true);
  };

  const handleDeleteServer = (server: MCPServer) => {
    setCurrentServer(server);
    setIsDeleteServerOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setServerForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLmStudioInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLmStudioForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveNewServer = () => {
    if (!serverForm.name || !serverForm.url) {
      toast({
        title: "Required fields missing",
        description: "Server name and URL are required",
        variant: "destructive"
      });
      return;
    }

    const newServer: MCPServer = {
      id: Date.now().toString(),
      name: serverForm.name,
      url: serverForm.url,
      apiKey: serverForm.apiKey,
      isActive: servers.length === 0 // Make first server active by default
    };

    setServers([...servers, newServer]);
    setIsAddServerOpen(false);
    toast({
      title: "Server added",
      description: `${newServer.name} has been added to your MCP servers.`
    });
  };

  const saveEditedServer = () => {
    if (!currentServer || !serverForm.name || !serverForm.url) {
      toast({
        title: "Required fields missing",
        description: "Server name and URL are required",
        variant: "destructive"
      });
      return;
    }

    const updatedServers = servers.map(server => 
      server.id === currentServer.id 
        ? { 
            ...server, 
            name: serverForm.name, 
            url: serverForm.url, 
            apiKey: serverForm.apiKey 
          } 
        : server
    );

    setServers(updatedServers);
    setIsEditServerOpen(false);
    toast({
      title: "Server updated",
      description: `${serverForm.name} has been updated.`
    });
  };

  const confirmDeleteServer = () => {
    if (!currentServer) return;
    
    const updatedServers = servers.filter(server => server.id !== currentServer.id);
    
    // If we're deleting the active server, make another one active
    if (currentServer.isActive && updatedServers.length > 0) {
      updatedServers[0].isActive = true;
    }
    
    setServers(updatedServers);
    setIsDeleteServerOpen(false);
    toast({
      title: "Server deleted",
      description: `${currentServer.name} has been removed.`
    });
  };

  const setActiveServer = (serverId: string) => {
    const updatedServers = servers.map(server => ({
      ...server,
      isActive: server.id === serverId
    }));
    
    setServers(updatedServers);
    toast({
      title: "Active server changed",
      description: `${updatedServers.find(s => s.id === serverId)?.name} is now the active server.`
    });
  };

  const testServerConnection = async (server: MCPServer) => {
    setTestingServer(server.id);
    
    toast({
      title: "Testing connection",
      description: `Attempting to connect to ${server.name}...`
    });
    
    try {
      const mcpService = getMCPService(server);
      const isConnected = await mcpService.testConnection();
      
      if (isConnected) {
        toast({
          title: "Connection successful",
          description: `Successfully connected to ${server.name}.`
        });
      } else {
        toast({
          title: "Connection failed",
          description: `Could not connect to ${server.name}.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: `Error connecting to ${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setTestingServer(null);
    }
  };
  
  const saveLmStudioConfig = () => {
    if (!lmStudioForm.baseUrl || !lmStudioForm.primaryModelName || !lmStudioForm.secondaryModelName) {
      toast({
        title: "Required fields missing",
        description: "LM Studio URL and model names are required",
        variant: "destructive"
      });
      return;
    }
    
    setLmStudioConfig(lmStudioForm);
    setIsLmStudioOpen(false);
    
    toast({
      title: "LM Studio settings saved",
      description: "Your LM Studio configuration has been updated."
    });
    
    // Initialize the LM Studio service with the new config
    try {
      initializeLMStudioService(lmStudioForm);
    } catch (error) {
      console.error('Failed to initialize LM Studio service:', error);
      toast({
        title: "Service initialization failed",
        description: "Failed to initialize LM Studio service with the new configuration.",
        variant: "destructive"
      });
    }
  };
  
  const testLmStudioConnection = async () => {
    setTestingServer('lmstudio');
    
    toast({
      title: "Testing LM Studio connection",
      description: `Attempting to connect to ${lmStudioForm.baseUrl}...`
    });
    
    try {
      // Create a temporary service instance with the form values
      const tempService = initializeLMStudioService({
        baseUrl: lmStudioForm.baseUrl,
        apiKey: lmStudioForm.apiKey,
        primaryModelName: lmStudioForm.primaryModelName,
        secondaryModelName: lmStudioForm.secondaryModelName
      });
      
      // Set a shorter timeout for the test
      tempService.setRequestTimeout(10000); // 10 seconds timeout for testing
      
      const isConnected = await tempService.testConnection();
      
      if (isConnected) {
        toast({
          title: "LM Studio connection successful",
          description: "Successfully connected to LM Studio."
        });
      } else {
        // Test additional model access if connection works but might have model issues
        let modelError = "";
        
        // Check the server but possibly wrong model configuration
        try {
          // Try a minimal request with the primary model
          await tempService.sendChatRequest(
            [{ id: 'test', role: 'user', content: 'test', timestamp: new Date() }],
            true, // Use primary model
            []
          );
        } catch (modelErr) {
          if (modelErr instanceof LMStudioError && modelErr.type === LMStudioErrorType.MODEL) {
            modelError = ` The model "${lmStudioForm.primaryModelName}" may not be available.`;
          }
        }
        
        toast({
          title: "LM Studio connection issue",
          description: `Connected to server but couldn't complete test request.${modelError}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      let errorMessage = "Unknown error occurred";
      let errorTitle = "LM Studio connection failed";
      
      if (error instanceof LMStudioError) {
        errorMessage = error.getUserMessage();
        
        // Provide more specific error titles based on error type
        switch (error.type) {
          case LMStudioErrorType.CONNECTION:
            errorTitle = "Connection failed";
            errorMessage = `Could not connect to ${lmStudioForm.baseUrl}. Is LM Studio running?`;
            break;
          case LMStudioErrorType.AUTHENTICATION:
            errorTitle = "Authentication failed";
            errorMessage = "Invalid API key or authentication issue.";
            break;
          case LMStudioErrorType.MODEL:
            errorTitle = "Model not found";
            errorMessage = `Model "${lmStudioForm.primaryModelName}" not found in LM Studio.`;
            break;
          case LMStudioErrorType.TIMEOUT:
            errorTitle = "Connection timeout";
            errorMessage = "Connection attempt timed out. Check if LM Studio is responding.";
            break;
          case LMStudioErrorType.SERVER:
            errorTitle = "Server error";
            errorMessage = "LM Studio server returned an error. Check server logs.";
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setTestingServer(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-auto scrollbar-thin">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Server Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure LM Studio and MCP servers for knowledge integration.
        </p>
      </div>

      <div className="flex-1 p-4 space-y-8">
        {/* LM Studio Configuration */}
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-md font-medium">LM Studio Configuration</h3>
            <Button 
              onClick={() => setIsLmStudioOpen(true)} 
              variant="outline"
              size="sm" 
              className="flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Edit Configuration
            </Button>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>LM Studio</CardTitle>
              <CardDescription>
                Local large language model inference server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Server URL:</span>
                  <span className="text-sm text-muted-foreground">{lmStudioConfig.baseUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">API Key:</span>
                  <span className="text-sm text-muted-foreground">
                    {lmStudioConfig.apiKey ? '••••••••••••••••' : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Detailed Model:</span>
                  <span className="text-sm text-muted-foreground">{lmStudioConfig.primaryModelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Quick Model:</span>
                  <span className="text-sm text-muted-foreground">{lmStudioConfig.secondaryModelName}</span>
                </div>

                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-sm flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      For advanced LM Studio settings, please use the AI Settings tab
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* MCP Servers */}
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-md font-medium">MCP Servers</h3>
            <Button onClick={handleAddServer} size="sm" className="flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Server
            </Button>
          </div>

          {servers.length === 0 ? (
            <Card className="border-dashed border-2 p-8">
              <div className="text-center">
                <ServerCog className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-medium">No MCP servers configured</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add an MCP server to integrate with external knowledge bases.
                </p>
                <Button onClick={handleAddServer} className="mt-4">
                  Add Your First Server
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {servers.map(server => (
                <Card key={server.id} className={`${server.isActive ? 'border-primary' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          {server.name}
                          {server.isActive && (
                            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center">
                          <Globe className="w-3 h-3 mr-1 inline" />
                          {server.url}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditServer(server)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteServer(server)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <span className="font-medium">API Key:</span> 
                      <span className="ml-2 text-muted-foreground">
                        {server.apiKey ? '••••••••••••••••' : 'Not set'}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testServerConnection(server)}
                      disabled={testingServer === server.id}
                    >
                      {testingServer === server.id ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>Test Connection</>
                      )}
                    </Button>
                    {!server.isActive && (
                      <Button 
                        size="sm"
                        onClick={() => setActiveServer(server.id)}
                      >
                        Set as Active
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add MCP Server Dialog */}
      <Dialog open={isAddServerOpen} onOpenChange={setIsAddServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
            <DialogDescription>
              Configure a new MCP server for knowledge integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Server Name *
              </label>
              <Input
                id="name"
                name="name"
                placeholder="My MCP Server"
                value={serverForm.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                Server URL *
              </label>
              <Input
                id="url"
                name="url"
                placeholder="https://mcp.example.com"
                value={serverForm.url}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                API Key (Optional)
              </label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Enter API key if required"
                value={serverForm.apiKey}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddServerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNewServer}>
              Add Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit MCP Server Dialog */}
      <Dialog open={isEditServerOpen} onOpenChange={setIsEditServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit MCP Server</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Server Name *
              </label>
              <Input
                id="edit-name"
                name="name"
                value={serverForm.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-url" className="text-sm font-medium">
                Server URL *
              </label>
              <Input
                id="edit-url"
                name="url"
                value={serverForm.url}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-apiKey" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="edit-apiKey"
                name="apiKey"
                type="password"
                placeholder={serverForm.apiKey ? "••••••••••••••••" : "No API key set"}
                value={serverForm.apiKey}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditServerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedServer}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete MCP Server Dialog */}
      <Dialog open={isDeleteServerOpen} onOpenChange={setIsDeleteServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete MCP Server</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the server "{currentServer?.name}"? 
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteServerOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteServer}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* LM Studio Config Dialog */}
      <Dialog open={isLmStudioOpen} onOpenChange={setIsLmStudioOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LM Studio Configuration</DialogTitle>
            <DialogDescription>
              Configure your local LM Studio connection settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="baseUrl" className="text-sm font-medium">
                LM Studio URL *
              </label>
              <Input
                id="baseUrl"
                name="baseUrl"
                placeholder="http://localhost:1234"
                value={lmStudioForm.baseUrl}
                onChange={handleLmStudioInputChange}
              />
              <p className="text-xs text-muted-foreground">
                The base URL for your local LM Studio instance.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                API Key (Optional)
              </label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Enter API key if required"
                value={lmStudioForm.apiKey}
                onChange={handleLmStudioInputChange}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="primaryModelName" className="text-sm font-medium">
                Detailed Model Name *
              </label>
              <Input
                id="primaryModelName"
                name="primaryModelName"
                placeholder="e.g., llama3"
                value={lmStudioForm.primaryModelName}
                onChange={handleLmStudioInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Model for detailed, comprehensive responses (slower).
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="secondaryModelName" className="text-sm font-medium">
                Quick Model Name *
              </label>
              <Input
                id="secondaryModelName"
                name="secondaryModelName"
                placeholder="e.g., phi3"
                value={lmStudioForm.secondaryModelName}
                onChange={handleLmStudioInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Model for fast, brief responses (quicker).
              </p>
            </div>
          </div>
          <DialogFooter className="flex items-center">
            <Button 
              variant="outline" 
              onClick={testLmStudioConnection}
              disabled={testingServer === 'lmstudio'}
              className="mr-auto"
            >
              {testingServer === 'lmstudio' ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>Test Connection</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsLmStudioOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveLmStudioConfig}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerConfig;
