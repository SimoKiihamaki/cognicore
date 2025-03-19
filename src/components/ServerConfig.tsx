
import { useState } from 'react';
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
import { toast } from '@/components/ui/use-toast';
import { Plus, Trash2, Edit, ServerCog, Globe } from 'lucide-react';

// Define the MCP server type
interface MCPServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  isActive: boolean;
}

const ServerConfig = () => {
  const [servers, setServers] = useLocalStorage<MCPServer[]>('mcp-servers', []);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [isEditServerOpen, setIsEditServerOpen] = useState(false);
  const [isDeleteServerOpen, setIsDeleteServerOpen] = useState(false);
  const [currentServer, setCurrentServer] = useState<MCPServer | null>(null);
  const [serverForm, setServerForm] = useState({
    name: '',
    url: '',
    apiKey: ''
  });

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
    toast({
      title: "Testing connection",
      description: `Attempting to connect to ${server.name}...`
    });
    
    try {
      // Simulate a connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would make an actual API request to the server
      toast({
        title: "Connection successful",
        description: `Successfully connected to ${server.name}.`
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: `Could not connect to ${server.name}.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-auto scrollbar-thin">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">MCP Server Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Add and configure MCP servers for knowledge integration.
        </p>
      </div>

      <div className="flex-1 p-4">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-md font-medium">Your Servers</h3>
          <Button onClick={handleAddServer} size="sm" className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Server
          </Button>
        </div>

        {servers.length === 0 ? (
          <Card className="border-dashed border-2 p-8">
            <div className="text-center">
              <ServerCog className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-medium">No servers configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add an MCP server to start integrating with external knowledge bases.
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
                  >
                    Test Connection
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

      {/* Add Server Dialog */}
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

      {/* Edit Server Dialog */}
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

      {/* Delete Server Dialog */}
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
    </div>
  );
};

export default ServerConfig;
