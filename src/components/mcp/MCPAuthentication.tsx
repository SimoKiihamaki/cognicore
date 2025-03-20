import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Check, Info, LockKeyhole, LogIn, Shield, Wifi, X } from 'lucide-react';
import { MCPServer, getMCPService } from '@/api/mcpApi';

export interface MCPAuthenticationProps {
  serverId: string;
  onAuthSuccess?: () => void;
  onAuthFailure?: (error: string) => void;
}

export interface MCPAuthState {
  serverId: string;
  status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  tokenInfo?: {
    token: string;
    expiresAt: Date;
    refreshToken?: string;
  };
  errorMessage?: string;
  lastAuthAttempt?: Date;
}

const MCPAuthentication = ({ serverId, onAuthSuccess, onAuthFailure }: MCPAuthenticationProps) => {
  const [servers, setServers] = useLocalStorage<MCPServer[]>('mcp-servers', []);
  const [authStates, setAuthStates] = useLocalStorage<MCPAuthState[]>('mcp-auth-states', []);
  const { toast } = useToast();
  
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    rememberMe: true
  });
  const [authenticating, setAuthenticating] = useState(false);
  
  const server = servers.find(s => s.id === serverId);
  const authState = authStates.find(a => a.serverId === serverId) || {
    serverId,
    status: 'idle'
  };
  
  // Check token expiration on component mount
  useEffect(() => {
    if (authState.status === 'authenticated' && authState.tokenInfo) {
      const expiryDate = new Date(authState.tokenInfo.expiresAt);
      const now = new Date();
      
      // If token is expired or expires in less than 5 minutes
      if (expiryDate < now || (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000)) {
        // Try to refresh token if available
        if (authState.tokenInfo.refreshToken) {
          refreshToken();
        } else {
          // Mark as needing reauthentication
          updateAuthState({
            status: 'idle',
            errorMessage: 'Your session has expired. Please log in again.'
          });
        }
      }
    }
  }, []);
  
  if (!server) {
    return (
      <Alert className="mb-4">
        <Shield className="h-4 w-4" />
        <AlertTitle>Server Not Found</AlertTitle>
        <AlertDescription>
          The selected MCP server could not be found in your configuration.
        </AlertDescription>
      </Alert>
    );
  }
  
  const updateAuthState = (update: Partial<MCPAuthState>) => {
    const newAuthStates = authStates.filter(a => a.serverId !== serverId);
    newAuthStates.push({
      ...authState,
      ...update
    });
    setAuthStates(newAuthStates);
  };
  
  const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const authenticate = async () => {
    if (!server) return;
    
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Login Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }
    
    setAuthenticating(true);
    updateAuthState({
      status: 'authenticating',
      lastAuthAttempt: new Date()
    });
    
    try {
      const mcpService = getMCPService(server);
      
      // This would be a real authentication request in a production app
      // For now, we'll mock the authentication flow
      const response = await mcpService.authenticate(credentials.username, credentials.password);
      
      if (response.success) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12); // Token expires in 12 hours
        
        updateAuthState({
          status: 'authenticated',
          tokenInfo: {
            token: response.token,
            expiresAt,
            refreshToken: response.refreshToken
          },
          errorMessage: undefined
        });
        
        toast({
          title: "Authentication Successful",
          description: `Successfully authenticated with ${server.name}`,
        });
        
        setIsAuthDialogOpen(false);
        onAuthSuccess?.();
      } else {
        updateAuthState({
          status: 'error',
          errorMessage: response.message || 'Authentication failed'
        });
        
        toast({
          title: "Authentication Failed",
          description: response.message || 'Invalid username or password',
          variant: "destructive"
        });
        
        onAuthFailure?.(response.message || 'Authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      updateAuthState({
        status: 'error',
        errorMessage
      });
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      onAuthFailure?.(errorMessage);
    } finally {
      setAuthenticating(false);
    }
  };
  
  const refreshToken = async () => {
    if (!server || !authState.tokenInfo?.refreshToken) return;
    
    updateAuthState({
      status: 'authenticating',
    });
    
    try {
      const mcpService = getMCPService(server);
      
      // Call the refresh token endpoint
      const response = await mcpService.refreshToken(authState.tokenInfo.refreshToken);
      
      if (response.success) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12); // New token expires in 12 hours
        
        updateAuthState({
          status: 'authenticated',
          tokenInfo: {
            token: response.token,
            expiresAt,
            refreshToken: response.refreshToken || authState.tokenInfo.refreshToken
          },
          errorMessage: undefined
        });
        
        toast({
          title: "Session Refreshed",
          description: `Successfully refreshed your session with ${server.name}`,
        });
      } else {
        // If refresh fails, we need user to log in again
        updateAuthState({
          status: 'idle',
          errorMessage: 'Your session has expired. Please log in again.'
        });
        
        toast({
          title: "Session Expired",
          description: 'Please log in again to continue',
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      updateAuthState({
        status: 'error',
        errorMessage
      });
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  const logout = () => {
    if (!server) return;
    
    // Remove authentication state
    const newAuthStates = authStates.filter(a => a.serverId !== serverId);
    setAuthStates(newAuthStates);
    
    toast({
      title: "Logged Out",
      description: `Successfully logged out from ${server.name}`,
    });
  };
  
  const renderAuthStatus = () => {
    switch (authState.status) {
      case 'idle':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Shield className="mr-2 h-4 w-4" />
              Not authenticated
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsAuthDialogOpen(true)}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </Button>
          </div>
        );
      
      case 'authenticating':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Shield className="mr-2 h-4 w-4 animate-pulse" />
              Authenticating...
            </div>
          </div>
        );
      
      case 'authenticated':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-green-500">
              <Check className="mr-2 h-4 w-4" />
              Authenticated
              {authState.tokenInfo?.expiresAt && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (expires {new Date(authState.tokenInfo.expiresAt).toLocaleTimeString()})
                </span>
              )}
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={logout}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        );
      
      case 'error':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-destructive">
              <X className="mr-2 h-4 w-4" />
              {authState.errorMessage || 'Authentication failed'}
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsAuthDialogOpen(true)}
            >
              Try Again
            </Button>
          </div>
        );
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Authentication Status</CardTitle>
          <CardDescription>
            {server.name} authentication status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderAuthStatus()}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground pt-0">
          <div className="flex items-center">
            <Info className="mr-1 h-3 w-3" />
            {authState.status === 'authenticated' 
              ? 'You are logged in and can access protected resources'
              : 'Authentication required to access protected resources'
            }
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log in to {server.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-muted">
              <Wifi className="h-4 w-4" />
              <AlertTitle>Secure Connection</AlertTitle>
              <AlertDescription className="text-xs">
                Your credentials are sent directly to the MCP server and are not stored locally.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={handleCredentialChange}
                disabled={authenticating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleCredentialChange}
                disabled={authenticating}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={credentials.rememberMe}
                onChange={handleCredentialChange}
                className="h-4 w-4 rounded border-gray-300"
                disabled={authenticating}
              />
              <Label htmlFor="rememberMe" className="text-sm">Remember me (stores refresh token)</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)} disabled={authenticating}>
              Cancel
            </Button>
            <Button onClick={authenticate} disabled={authenticating}>
              {authenticating ? (
                <>
                  <LockKeyhole className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MCPAuthentication;