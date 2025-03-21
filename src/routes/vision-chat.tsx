import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/hooks/use-toast';
import VisionChat from '@/components/chat/VisionChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

/**
 * Vision Chat route component that provides image-based chat interactions
 * with LM Studio integration.
 */
const VisionChatRoute: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);

  // Check LM Studio connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // This would typically come from a service like lmStudioService
        const isLmStudioConnected = localStorage.getItem('lmStudio-connected') === 'true';
        setIsConnected(isLmStudioConnected);
        
        if (!isLmStudioConnected) {
          toast({
            title: 'LM Studio Connection',
            description: 'Not connected to LM Studio. Vision chat requires LM Studio connection.',
            variant: 'warning',
          });
        }
      } catch (error) {
        console.error('Error checking LM Studio connection:', error);
        setIsConnected(false);
      }
    };

    checkConnection();
  }, [toast]);

  return (
    <>
      <Helmet>
        <title>Vision Chat | CogniCore</title>
        <meta name="description" content="Chat with images using AI" />
      </Helmet>

      <div className="container mx-auto p-4 h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vision Chat</h1>
            <p className="text-muted-foreground">Interact with your images using AI</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected to LM Studio' : 'Not connected'}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
            >
              Configure
            </Button>
          </div>
        </div>

        {!isConnected ? (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>LM Studio Connection Required</CardTitle>
              <CardDescription>
                Connect to LM Studio to enable vision chat capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>To use vision chat, you need to connect to LM Studio with a model that supports vision capabilities:</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>Download and install LM Studio from their website</li>
                <li>Start LM Studio and load a multimodal model that supports vision (e.g. Gemma 3, LLaVA, Claude 3)</li>
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
          <div className="flex-1 overflow-hidden">
            <VisionChat />
          </div>
        )}
      </div>
    </>
  );
};

export default VisionChatRoute;