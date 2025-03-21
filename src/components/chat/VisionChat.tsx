import React, { useState } from 'react';
import VisionChatInput from './VisionChatInput';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, User, Bot } from 'lucide-react';
import { getLMStudioService } from '@/api/lmStudioApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const VisionChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if vision is supported
  const lmStudioService = (() => {
    try {
      return getLMStudioService();
    } catch (error) {
      console.error('Error getting LM Studio service:', error);
      return null;
    }
  })();
  
  const visionSupported = lmStudioService?.config.supportsVision || false;
  
  // Handle new message and assistant response
  const handleMessageSent = (userMessage: string, aiResponse: string) => {
    // Generate IDs for new messages
    const userMessageId = `msg-${Date.now()}-user`;
    const aiMessageId = `msg-${Date.now() + 1}-ai`;
    
    // Add user message and AI response
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: userMessage
      },
      {
        id: aiMessageId,
        role: 'assistant',
        content: aiResponse
      }
    ]);
    
    // Set processing state
    setIsProcessing(false);
  };
  
  return (
    <div className="flex flex-col h-full">
      {!visionSupported && (
        <Alert variant="warning" className="mb-4">
          <Image className="h-4 w-4" />
          <AlertTitle>Vision capabilities not available</AlertTitle>
          <AlertDescription>
            The current LM Studio model doesn't support vision capabilities.
            Please select a multimodal model that supports vision, such as Gemma 3, LLaVA, or Claude 3.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex-1 overflow-hidden mb-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chat History</CardTitle>
            <CardDescription>
              Your conversation with the AI assistant
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <Image className="h-8 w-8 mb-2 text-primary" />
                  <p className="text-center">
                    Send a message with an image to start a conversation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`flex max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        } rounded-lg p-3`}
                      >
                        <div className="mr-2 mt-0.5">
                          {message.role === 'user' ? (
                            <User className="h-5 w-5" />
                          ) : (
                            <Bot className="h-5 w-5" />
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      <VisionChatInput 
        onMessageSent={handleMessageSent}
        isLoading={isProcessing}
      />
    </div>
  );
};

export default VisionChat;