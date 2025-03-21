import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MessagesSquare, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from '@/components/ChatInterface';
import EnhancedChatInterface from '@/components/chat/EnhancedChatInterface';
import LMStudioChat from '@/components/chat/LMStudioChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import ChatHistoryList from '@/components/chat/ChatHistoryList';
import { useChatHistory } from '@/hooks/useChatHistory';

/**
 * Chat route component that provides multimodal chat interactions
 * with LM Studio integration and various chat interfaces.
 */
const ChatRoute = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('enhanced');
  const [showHistory, setShowHistory] = useState(false);
  
  // Get chat history functionality
  const { createHistory, histories, currentHistory, loadHistory } = useChatHistory();

  // Check LM Studio connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Get the LM Studio configuration
        const lmStudioConfig = JSON.parse(localStorage.getItem('lmStudio-config') || '{}');
        
        if (!lmStudioConfig.baseUrl) {
          // No configuration set
          setIsConnected(false);
          
          toast({
            title: 'LM Studio Not Configured',
            description: 'Please configure LM Studio in the settings to enable chat features.',
            variant: 'warning',
          });
          return;
        }
        
        // Initialize the LM Studio service with the configuration
        const { initializeLMStudioService } = await import('@/api/lmStudioApi');
        const lmStudioService = initializeLMStudioService({
          baseUrl: lmStudioConfig.baseUrl,
          apiKey: lmStudioConfig.apiKey || '',
          primaryModelName: lmStudioConfig.primaryModelName || 'default',
          secondaryModelName: lmStudioConfig.secondaryModelName || 'default'
        });
        
        // Test the connection
        const connectionSuccessful = await lmStudioService.testConnection();
        
        setIsConnected(connectionSuccessful);
        
        // Store connection status in localStorage for other components
        localStorage.setItem('lmStudio-connected', connectionSuccessful ? 'true' : 'false');
        
        if (!connectionSuccessful) {
          toast({
            title: 'LM Studio Connection Failed',
            description: 'Could not connect to LM Studio. Some features may be limited.',
            variant: 'warning',
          });
        } else {
          // Connection successful
          console.log('Connected to LM Studio successfully');
        }
      } catch (error) {
        console.error('Error checking LM Studio connection:', error);
        setIsConnected(false);
        localStorage.setItem('lmStudio-connected', 'false');
        
        toast({
          title: 'LM Studio Connection Error',
          description: error instanceof Error ? error.message : 'Unknown error connecting to LM Studio',
          variant: 'destructive',
        });
      }
    };

    checkConnection();
  }, [toast]);

  // Function to start a new chat - direct approach
  const startNewChat = async () => {
    try {
      // Set the enhanced tab as active
      setActiveTab('enhanced');
      
      // Get current model information
      let modelName = 'Unknown Model';
      try {
        const lmStudioConfig = JSON.parse(localStorage.getItem('lmStudio-config') || '{}');
        modelName = lmStudioConfig.primaryModelName || 'default';
      } catch (error) {
        console.error('Failed to get LM Studio config:', error);
      }
      
      // Create a new chat directly
      const systemMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'You are a helpful AI assistant that helps users manage their knowledge and notes.',
        timestamp: new Date()
      };
      
      const welcomeMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Hi there! How can I help you today?',
        timestamp: new Date()
      };
      
      // Create a new chat history
      const historyId = await createHistory(
        [systemMessage, welcomeMessage],
        'New Conversation',
        modelName
      );
      
      if (historyId) {
        // Load the new chat
        await loadHistory(historyId);
        
        // Show toast confirmation
        toast({
          title: 'New Chat Created',
          description: 'Starting a fresh conversation',
        });
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error Creating Chat',
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Chat | CogniCore</title>
        <meta name="description" content="Chat with your notes using AI" />
      </Helmet>

      <div className="container mx-auto p-4 h-full flex flex-col">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div>
              <h1 className="text-2xl font-bold">Chat</h1>
              <p className="text-muted-foreground">Interact with your notes using AI</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center mr-2">
              <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected to LM Studio' : 'Not connected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/settings')}
              >
                Configure
              </Button>
              
              {isConnected && (
                <Button
                  variant="default"
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                  onClick={startNewChat}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              )}
            </div>
          </div>
        </div>

        {!isConnected ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>LM Studio Connection Required</CardTitle>
              <CardDescription>
                Connect to LM Studio to enable AI chat capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>To use the chat features, you need to connect to LM Studio, a local LLM inference server.</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>Download and install LM Studio from their website</li>
                <li>Start LM Studio and load a model</li>
                <li>Start the local server in LM Studio</li>
                <li>Configure the connection in CogniCore settings</li>
              </ol>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/settings')}>
                Go to Settings
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Tabs 
            value={activeTab} 
            className="w-full h-full flex flex-col" 
            onValueChange={setActiveTab}
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
              <TabsTrigger value="lmstudio">LM Studio</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden mt-4">
              <TabsContent value="standard" className="h-full">
                <ChatInterface />
              </TabsContent>
              
              <TabsContent value="enhanced" className="h-full">
                <EnhancedChatInterface />
              </TabsContent>
              
              <TabsContent value="lmstudio" className="h-full">
                <LMStudioChat />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </>
  );
};

export default ChatRoute;
