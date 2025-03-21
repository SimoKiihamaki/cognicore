import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/ui/icons';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Define message types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

/**
 * Direct LM Studio Chat interface for interacting with
 * the locally running LLM with custom prompt configurations.
 */
const LMStudioChat: React.FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Connected to LM Studio. You are now chatting directly with the model.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [modelName, setModelName] = useState('default');
  const [availableModels, setAvailableModels] = useState<string[]>([
    'default',
    'llama2-7b-chat',
    'mistral-7b-instruct',
    'vicuna-13b'
  ]);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check LM Studio connection on load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const config = JSON.parse(localStorage.getItem('lmStudio-config') || '{}');
        const baseUrl = config.baseUrl || 'http://localhost:1234';
        const apiKey = config.apiKey || '';
        
        // Create headers
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // Attempt to connect with a timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000);
        
        const response = await fetch(`${baseUrl}/v1/models`, {
          method: 'GET',
          headers,
          signal: abortController.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setConnectionStatus('connected');
          
          // Try to get available models
          try {
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              const models = data.data.map((model: any) => model.id || 'unknown');
              if (models.length > 0) {
                setAvailableModels(models);
              }
            }
          } catch (err) {
            console.warn('Could not parse models response', err);
          }
          
          setMessages(prev => [
            {
              id: '1',
              role: 'system',
              content: 'Successfully connected to LM Studio. You can now chat with the model.',
              timestamp: new Date()
            }
          ]);
        } else {
          setConnectionStatus('disconnected');
          setMessages(prev => [
            {
              id: '1',
              role: 'system',
              content: `Failed to connect to LM Studio: ${response.status} ${response.statusText}. Please check your settings and make sure LM Studio is running.`,
              timestamp: new Date(),
              isError: true
            }
          ]);
        }
      } catch (error) {
        setConnectionStatus('disconnected');
        let errorMessage = 'Failed to connect to LM Studio.';
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Connection to LM Studio timed out. Please check if LM Studio is running.';
          } else {
            errorMessage = `Cannot connect to LM Studio: ${error.message}`;
          }
        }
        
        setMessages(prev => [
          {
            id: '1',
            role: 'system',
            content: errorMessage + ' Please verify your settings in the Settings panel.',
            timestamp: new Date(),
            isError: true
          }
        ]);
        
        toast({
          title: 'Connection Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };
    
    checkConnection();
  }, [toast]);

  // Generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    // Check connection status first
    if (connectionStatus === 'disconnected') {
      toast({
        title: 'Not Connected',
        description: 'Cannot send message. Not connected to LM Studio.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsStreaming(true);
      
      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: input,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      
      // Add empty assistant message
      const assistantMessageId = generateId();
      setMessages(prev => [
        ...prev, 
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        }
      ]);
      
      // Get message history for the API call (include system prompt)
      const messageHistory: Message[] = [
        {
          id: 'system',
          role: 'system',
          content: systemPrompt,
          timestamp: new Date()
        },
        ...messages.filter(m => m.role !== 'system'),
        userMessage
      ];
      
      // Stream response from LM Studio
      let fullResponse = '';
      
      try {
        const responseChunks = await streamResponseFromLMStudio(messageHistory);
        
        for (const chunk of responseChunks) {
          if (!isStreaming) break; // Allow cancellation
          
          fullResponse += chunk;
          
          // Update the last message with the current accumulated response
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessageIndex = newMessages.findIndex(m => m.id === assistantMessageId);
            if (lastMessageIndex !== -1) {
              newMessages[lastMessageIndex].content = fullResponse;
            }
            return newMessages;
          });
          
          // Small delay to avoid too many state updates
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } catch (error) {
        // Handle specific errors
        let errorMessage = 'An error occurred while streaming the response.';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        // Update the message with the error
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessageIndex = newMessages.findIndex(m => m.id === assistantMessageId);
          if (lastMessageIndex !== -1) {
            newMessages[lastMessageIndex] = {
              ...newMessages[lastMessageIndex],
              content: `Error: ${errorMessage}`,
              isError: true
            };
          }
          return newMessages;
        });
        
        // Show toast
        toast({
          title: 'LM Studio Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      setIsStreaming(false);
    } catch (error) {
      console.error('Error in message handling:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your message',
        variant: 'destructive',
      });
      setIsStreaming(false);
    }
  };

  // Cancel streaming response
  const handleCancelStream = () => {
    setIsStreaming(false);
    toast({
      title: 'Generation stopped',
      description: 'The response generation was cancelled',
    });
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([{
      id: '1',
      role: 'system',
      content: 'Chat history cleared.',
      timestamp: new Date(),
    }]);
  };

  // Test LM Studio connection
  const testConnection = async () => {
    try {
      const config = JSON.parse(localStorage.getItem('lmStudio-config') || '{}');
      const baseUrl = config.baseUrl || 'http://localhost:1234';
      const apiKey = config.apiKey || '';
      
      toast({
        title: 'Testing Connection',
        description: `Attempting to connect to ${baseUrl}...`,
      });
      
      // Create headers
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // Attempt to connect with a timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000);
      
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers,
        signal: abortController.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setConnectionStatus('connected');
        
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to LM Studio.',
        });
        
        // Try to get available models
        try {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            const models = data.data.map((model: any) => model.id || 'unknown');
            if (models.length > 0) {
              setAvailableModels(models);
              toast({
                title: 'Models Loaded',
                description: `Found ${models.length} available models.`,
              });
            }
          }
        } catch (err) {
          console.warn('Could not parse models response', err);
        }
      } else {
        setConnectionStatus('disconnected');
        toast({
          title: 'Connection Failed',
          description: `Failed to connect to LM Studio: ${response.status} ${response.statusText}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      
      let errorMessage = 'Failed to connect to LM Studio.';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Connection to LM Studio timed out. Please check if LM Studio is running.';
        } else {
          errorMessage = `Cannot connect to LM Studio: ${error.message}`;
        }
      }
      
      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Handle streaming response from LM Studio
  const streamResponseFromLMStudio = async (messageHistory: Message[]): Promise<string[]> => {
    try {
      // Create an array to store the chunks
      const chunks: string[] = [];
      
      // Format messages for LM Studio API
      const formattedMessages = messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add system prompt if needed
      if (formattedMessages[0]?.role !== 'system') {
        formattedMessages.unshift({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      // Get LM Studio configuration
      const config = JSON.parse(localStorage.getItem('lmStudio-config') || '{}');
      const baseUrl = config.baseUrl || 'http://localhost:1234';
      const apiKey = config.apiKey || '';
      
      // Verify LM Studio configuration
      if (!baseUrl) {
        throw new Error('LM Studio base URL is not configured. Please check your settings.');
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      // Make the request to LM Studio
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: formattedMessages,
          model: modelName,
          temperature,
          max_tokens: maxTokens,
          stream: true // Use streaming
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Check specific status codes for more helpful messages
        if (response.status === 404) {
          throw new Error(`Model '${modelName}' not found. Please check your model selection.`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please check your API key.');
        } else if (response.status === 500) {
          throw new Error('LM Studio server error. The model might have crashed or run out of memory.');
        } else if (response.status === 400) {
          throw new Error('Bad request. Please check your input parameters (temperature, max tokens, etc.).');
        }
        
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      // Initialize the reader
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available from response. The server might not support streaming responses.');
      }
      
      // Initialize text decoder
      const decoder = new TextDecoder();
      
      // Read stream chunks
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Process the chunk (format depends on the API's streaming format)
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices?.[0]?.delta?.content || "";
              if (content) {
                chunks.push(content);
              }
            } catch (err) {
              console.error("Error parsing chunk:", err, "Raw data:", data);
              // Continue instead of stopping on parsing errors
            }
          }
        }
      }
      
      // If no chunks were received, something went wrong
      if (chunks.length === 0) {
        throw new Error('Received empty response from LM Studio.');
      }
      
      return chunks;
    } catch (error) {
      console.error("Error streaming from LM Studio:", error);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection to LM Studio.');
      }
      
      // NetworkError is not directly accessible, check message content
      if (error instanceof Error && 
          (error.message.includes('NetworkError') || 
           error.message.includes('Failed to fetch') || 
           error.message.includes('network request failed'))) {
        throw new Error('Network connection to LM Studio failed. Please make sure LM Studio is running and accessible.');
      }
      
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className={`h-2 w-2 rounded-full mr-2 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="font-medium">LM Studio Direct</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={testConnection}
          >
            <Icons.refresh className="w-4 h-4 mr-2" />
            Test Connection
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Icons.settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearChat}
          >
            <Icons.trash className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
      
      {showSettings && (
        <div className="border-b p-4">
          <Card>
            <CardContent className="pt-6 grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={modelName} onValueChange={setModelName}>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="streaming">Streaming</Label>
                    <Switch id="streaming" checked={true} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Temperature: {temperature.toFixed(1)}</Label>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Max Tokens: {maxTokens}</Label>
                </div>
                <Slider
                  id="max-tokens"
                  min={256}
                  max={4096}
                  step={256}
                  value={[maxTokens]}
                  onValueChange={(value) => setMaxTokens(value[0])}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Input 
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : message.role === 'system' 
                      ? message.isError 
                        ? 'bg-destructive text-destructive-foreground text-center w-full text-sm' 
                        : 'bg-muted text-muted-foreground text-center w-full text-sm' 
                      : 'bg-secondary'
                }`}
              >
                <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
              </div>
            </div>
          ))}
          
          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg px-4 py-2 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming || connectionStatus === 'disconnected'}
          />
          {isStreaming ? (
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleCancelStream}
            >
              <Icons.xCircle className="w-4 h-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={!input.trim() || connectionStatus === 'disconnected'}
            >
              <Icons.send className="w-4 h-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};

export default LMStudioChat;