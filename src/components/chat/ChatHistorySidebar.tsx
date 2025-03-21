import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import ChatHistoryList from './ChatHistoryList';
import { Button } from '@/components/ui/button';
import { History, PlusCircle } from 'lucide-react';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useToast } from '@/hooks/use-toast';

interface ChatHistorySidebarProps {
  children?: React.ReactNode;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ children }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { createHistory, histories, currentHistory, loadHistory } = useChatHistory();

  // Function to start a new chat
  const startNewChat = async () => {
    try {
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
        
        // Navigate to chat page
        navigate('/chat');
        
        // Show toast confirmation
        toast({
          title: 'New Chat Created',
          description: 'Starting a fresh conversation',
        });
        
        // Close the sidebar if it's open
        setOpen(false);
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

  // Select a history and close the sidebar
  const handleSelectHistory = (history) => {
    loadHistory(history.id);
    navigate('/chat');
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <History className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Chat History</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-8rem)] overflow-hidden">
          <ChatHistoryList 
            onSelectHistory={handleSelectHistory} 
            onNewChat={startNewChat}
            currentHistoryId={currentHistory?.id}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatHistorySidebar;
