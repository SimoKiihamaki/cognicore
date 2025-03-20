import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, Paperclip, Info, Clock, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotes } from '@/hooks/useNotes';
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getLMStudioService, LMStudioError, LMStudioErrorType } from '@/api/lmStudioApi';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { findSimilarContent } from '@/utils/noteOrganizer';
import { Badge } from '@/components/ui/badge';
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer';

interface ChatInterfaceProps {
  asSidebar?: boolean;
}

const ChatInterface = ({ asSidebar = false }: ChatInterfaceProps) => {
  const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>('cognicore-chat-history', [
    {
      id: '1',
      role: 'assistant',
      content: 'Hi there! How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  
  const { notes } = useNotes();
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [similarContexts, setSimilarContexts] = useState<{ id: string; title: string; excerpt: string }[]>([]);
  const [showContexts, setShowContexts] = useState(false);
  const [useDetailedModel, setUseDetailedModel] = useState(true);
  
  // Get offline status
  const { isOnline, isOfflineModeEnabled } = useOfflineStatus();
  
  // Get offline queue
  const { queueOperation } = useOfflineQueue();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = useMemo(() => chatHistory, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!asSidebar) {
      inputRef.current?.focus();
    }
  }, [asSidebar]);

  // Find related contexts for the current query
  const findRelatedContexts = useCallback((query: string) => {
    if (!query.trim() || notes.length === 0) return [];
    
    const queryNote = {
      id: 'temp-query',
      title: '',
      content: query,
      folderId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Find similar notes based on the query
    const similarItems = findSimilarContent(
      'temp-query', 
      [queryNote, ...notes], 
      0.2
    ).filter(item => item.type === 'note');
    
    // Format the results for display
    return similarItems.slice(0, 3).map(item => {
      const note = notes.find(n => n.id === item.id);
      if (!note) return null;
      
      // Create a short excerpt
      const excerpt = note.content.length > 150 
        ? note.content.substring(0, 150) + '...' 
        : note.content;
      
      return {
        id: note.id,
        title: note.title,
        excerpt,
        similarity: item.similarity
      };
    }).filter(Boolean) as { id: string; title: string; excerpt: string; similarity: number }[];
  }, [notes]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Create the user message
    const userMessageId = uuidv4();
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    // Update the UI with the user message
    setChatHistory(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Reset input height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    // Get current LM Studio configuration (for error handling)
    const lmStudioConfig = JSON.parse(localStorage.getItem('lmStudio-config') || '{}');
    
    // Find similar contexts
    const contexts = findRelatedContexts(inputValue);
    setSimilarContexts(contexts);
    setShowContexts(contexts.length > 0);
    
    // Prepare for processing
    setIsProcessing(true);
    
    // Check if offline
    if (!isOnline) {
      if (isOfflineModeEnabled) {
        // Queue the operation for when we're back online
        queueOperation('lm-studio-chat', {
          message: inputValue,
          contexts,
          useDetailedModel
        });
        
        // Create a placeholder message for offline mode
        const offlineMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: "I've received your message, but you're currently offline. Your request has been queued and will be processed when you're back online.",
          timestamp: new Date(),
          isError: true
        };
        
        // Update the chat history with the offline message
        setChatHistory(prev => [...prev, offlineMessage]);
        setIsProcessing(false);
        return;
      } else {
        // Show error message if offline mode is not enabled
        const offlineErrorMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: "You're currently offline. Please enable offline mode in settings to queue messages for later, or connect to the internet to use the chat feature.",
          timestamp: new Date(),
          isError: true
        };
        
        // Update the chat history with the error message
        setChatHistory(prev => [...prev, offlineErrorMessage]);
        setIsProcessing(false);
        
        // Show toast
        toast({
          title: 'Offline',
          description: 'You need to be online to use the chat feature.',
          variant: 'destructive'
        });
        
        return;
      }
    }
    
    try {
      // Get the LM Studio service
      const lmStudioService = getLMStudioService();
      
      // Format the context data
      const contextTexts = contexts.map(ctx => 
        `Title: ${ctx.title}\nContent: ${ctx.excerpt}`
      );
      
      // Send the request to LM Studio
      const response = await lmStudioService.sendChatRequest(
        chatHistory.slice(-10).concat(userMessage), // Last 10 messages + current
        useDetailedModel,
        contextTexts
      );
      
      // Create the assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        referencedContexts: contexts.length > 0 ? contexts.map(c => c.id) : undefined
      };
      
      // Update the chat history
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response from LM Studio:', error);
      
      // Get user-friendly error message based on error type
      let errorTitle = 'Connection Error';
      let errorDescription = 'Failed to connect to LM Studio. Check your configuration in the settings.';
      let errorContent = "I'm sorry, I couldn't process your request due to a connection issue with LM Studio. Please check your connection settings and try again.";
      
      if (error instanceof LMStudioError) {
        errorContent = `I'm sorry, I couldn't process your request: ${error.getUserMessage()}`;
        
        switch (error.type) {
          case LMStudioErrorType.CONNECTION:
            errorTitle = 'Connection Error';
            errorDescription = 'Failed to connect to LM Studio server. Please check if it\'s running properly.';
            break;
          case LMStudioErrorType.AUTHENTICATION:
            errorTitle = 'Authentication Error';
            errorDescription = 'Invalid API key. Please check your LM Studio configuration.';
            break;
          case LMStudioErrorType.MODEL:
            errorTitle = 'Model Error';
            errorDescription = `Model "${useDetailedModel ? lmStudioConfig.primaryModelName : lmStudioConfig.secondaryModelName}" not found. Please check your model configuration.`;
            break;
          case LMStudioErrorType.TIMEOUT:
            errorTitle = 'Request Timeout';
            errorDescription = 'LM Studio request timed out. Try a shorter prompt or a different model.';
            break;
          case LMStudioErrorType.SERVER:
            errorTitle = 'Server Error';
            errorDescription = 'LM Studio server encountered an error. Check your server logs.';
            break;
          default:
            errorTitle = 'LM Studio Error';
            errorDescription = error.getUserMessage();
        }
      }
      
      // Create an error message
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true
      };
      
      // Update the chat history with the error
      setChatHistory(prev => [...prev, errorMessage]);
      
      // Show a toast notification
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isProcessing) {
        handleSendMessage();
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const toggleModel = () => {
    setUseDetailedModel(!useDetailedModel);
    toast({
      title: useDetailedModel ? 'Using Fast Model' : 'Using Detailed Model',
      description: useDetailedModel 
        ? 'Switched to quicker responses with less detail.' 
        : 'Switched to more detailed responses (may be slower).'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`p-4 border-b border-border flex items-center justify-between ${asSidebar ? 'hidden sm:flex' : ''}`}>
        <div>
          <h2 className="text-lg font-medium">Chat</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your notes or upload images for analysis.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={toggleModel}
                  className="p-1.5 rounded-md hover:bg-accent/50 focus-ring"
                  aria-label={useDetailedModel ? "Switch to fast model" : "Switch to detailed model"}
                >
                  {useDetailedModel ? (
                    <Clock className="w-5 h-5 text-primary" />
                  ) : (
                    <Info className="w-5 h-5 text-primary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {useDetailedModel 
                  ? "Currently using detailed model (slower but more comprehensive)" 
                  : "Currently using fast model (quicker but less detailed)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.isError
                    ? 'bg-destructive/10 border border-destructive/20'
                    : 'glass'
              } ${asSidebar ? 'text-sm' : ''}`}
            >
              {/* Render message content with markdown support */}
              <div className="whitespace-pre-wrap break-words">
                <MarkdownRenderer content={message.content} />
              </div>
              
              {/* Show referenced contexts if any */}
              {message.referencedContexts && message.referencedContexts.length > 0 && (
                <div className="mt-2 text-xs flex flex-wrap gap-1">
                  <span className="text-muted-foreground">Referenced notes:</span>
                  {message.referencedContexts.map(contextId => {
                    const note = notes.find(n => n.id === contextId);
                    return note ? (
                      <Badge key={contextId} variant="outline" className="text-xs">
                        {note.title}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
              
              {/* Message timestamp */}
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {message.timestamp instanceof Date 
                  ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              </div>
            </div>
          </div>
        ))}
        
        {/* Show similar contexts panel if available */}
        {showContexts && similarContexts.length > 0 && (
          <div className="flex justify-center my-2">
            <div className="glass rounded-lg p-2 text-sm max-w-[90%]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Related Context</span>
                <button 
                  onClick={() => setShowContexts(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2">
                {similarContexts.map(context => (
                  <div key={context.id} className="border-l-2 border-primary/30 pl-2">
                    <div className="font-medium text-xs">{context.title}</div>
                    <div className="text-xs text-muted-foreground">{context.excerpt}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Show loading indicator when processing */}
        {isProcessing && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{useDetailedModel ? 'Thinking...' : 'Responding...'}</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask something..."
              disabled={isProcessing}
              className="flex-1 bg-transparent border-0 p-2.5 max-h-32 focus:outline-none resize-none scrollbar-thin text-sm disabled:opacity-50"
              style={{ height: '40px' }}
            />
            <div className="flex items-center p-1 gap-1">
              <button
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground button-hover-effect focus-ring"
                aria-label="Upload image"
                disabled={isProcessing}
              >
                <Image className={`${asSidebar ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </button>
              <button
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground button-hover-effect focus-ring"
                aria-label="Upload file"
                disabled={isProcessing}
              >
                <Paperclip className={`${asSidebar ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className={`p-1.5 rounded-lg focus-ring ${
                  inputValue.trim() && !isProcessing
                    ? 'text-primary hover:bg-primary/10 button-hover-effect'
                    : 'text-muted-foreground cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                {isProcessing ? (
                  <Loader2 className={`animate-spin ${asSidebar ? 'w-4 h-4' : 'w-5 h-5'}`} />
                ) : (
                  <Send className={`${asSidebar ? 'w-4 h-4' : 'w-5 h-5'}`} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
