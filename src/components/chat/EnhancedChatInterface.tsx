import React, { useState, useEffect, useRef } from 'react';
import { Folders, MessagesSquare, History, X, ArrowLeft, Save } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useChatHistory } from '@/hooks/useChatHistory';
import { ChatHistory, ChatMessage } from '@/lib/types';
import ChatHistoryList from './ChatHistoryList';
import ChatInterface from '../ChatInterface';
import { getLMStudioService } from '@/api/lmStudioApi';

const EnhancedChatInterface: React.FC = () => {
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [historyWidth, setHistoryWidth] = useState(25);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const { toast } = useToast();
  
  const {
    histories,
    currentHistory,
    loading,
    createHistory,
    loadHistory,
    addMessage
  } = useChatHistory();

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Start a new chat
  const handleNewChat = async () => {
    try {
      // Get current model information
      let modelName = 'Unknown Model';
      try {
        const lmStudioService = getLMStudioService();
        modelName = lmStudioService.config.primaryModelName;
      } catch (error) {
        console.error('Failed to get LM Studio config:', error);
      }
      
      // Create initial system message
      const systemMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'You are a helpful AI assistant that helps users manage their knowledge and notes.',
        timestamp: new Date()
      };
      
      // Create welcome message
      const welcomeMessage: ChatMessage = {
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
      
      // Set as active chat
      setActiveChatId(historyId);
      
      // Close mobile history panel if open
      if (isMobile) {
        setShowMobileHistory(false);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create new chat',
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  // Handle selecting a chat history
  const handleSelectHistory = (history: ChatHistory) => {
    loadHistory(history.id);
    setActiveChatId(history.id);
    
    // Close mobile history panel if open
    if (isMobile) {
      setShowMobileHistory(false);
    }
  };

  // Callback to handle messages from the chat interface
  const handleUserMessageSent = (message: string, aiResponse: string) => {
    if (!currentHistory) {
      // If no active chat, create one with this message
      handleNewChat();
      return;
    }
    
    const timestamp = new Date();
    
    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp
    };
    
    // Create AI response message
    const aiMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(timestamp.getTime() + 1000) // 1 second later
    };
    
    // Update the current history with both messages
    addMessage(userMessage).then(() => {
      addMessage(aiMessage);
    });
  };

  // Initialize with a new chat if none exists
  useEffect(() => {
    const initializeChat = async () => {
      if (histories.length === 0 && !loading) {
        await handleNewChat();
      } else if (histories.length > 0 && !activeChatId) {
        // Load the most recent chat history
        setActiveChatId(histories[0].id);
        loadHistory(histories[0].id);
      }
    };
    
    initializeChat();
  }, [histories, loading]);
  
  // Check for URL parameters on load - support for "new" parameter to start new chat
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('new') === 'true') {
      handleNewChat();
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url);
    }
  }, []);

  // Render mobile version
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileHistory(true)}
            >
              <History className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-medium">
              {currentHistory?.title || 'Chat'}
            </h2>
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleNewChat}
            className="bg-primary hover:bg-primary/90"
            aria-label="Start new chat"
          >
            <MessagesSquare className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {currentHistory ? (
            <ChatInterface 
              key={currentHistory.id}
              asSidebar={false} 
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Button onClick={handleNewChat}>
                <MessagesSquare className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          )}
        </div>
        
        <Sheet open={showMobileHistory} onOpenChange={setShowMobileHistory}>
          <SheetContent side="left" className="p-0 w-4/5 sm:max-w-sm">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-medium">Chat History</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileHistory(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <ChatHistoryList
                  onSelectHistory={handleSelectHistory}
                  onNewChat={handleNewChat}
                  currentHistoryId={activeChatId || undefined}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Render desktop version
  return (
    <div className="h-full flex flex-col">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 h-full"
        onLayout={(sizes) => {
          // Save the chat history width when it changes
          setHistoryWidth(sizes[0]);
        }}
      >
        {showChatHistory && (
          <>
            <ResizablePanel 
              defaultSize={historyWidth} 
              minSize={20} 
              maxSize={40}
              className="border-r"
            >
              <ChatHistoryList
                onSelectHistory={handleSelectHistory}
                onNewChat={handleNewChat}
                currentHistoryId={activeChatId || undefined}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
          </>
        )}
        
        <ResizablePanel defaultSize={showChatHistory ? 100 - historyWidth : 100}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                {!showChatHistory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChatHistory(true)}
                    className="mr-2"
                  >
                    <History className="h-5 w-5" />
                  </Button>
                )}
                <h2 className="text-lg font-medium">
                  {currentHistory?.title || 'Chat'}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                {showChatHistory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChatHistory(false)}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNewChat}
                  className="bg-primary hover:bg-primary/90"
                  aria-label="Start new chat"
                >
                  <MessagesSquare className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {currentHistory ? (
                <ChatInterface 
                  key={currentHistory.id}
                  asSidebar={false} 
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Button onClick={handleNewChat}>
                    <MessagesSquare className="h-4 w-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default EnhancedChatInterface;