import React, { useState, useEffect } from 'react';
import { ChatHistory } from '@/lib/types';
import { useChatHistory } from '@/hooks/useChatHistory';
import { 
  Star, 
  Clock, 
  Search, 
  Trash2, 
  MessageSquare, 
  X, 
  Loader2,
  MoreVertical,
  FileDown,
  FileUp,
  Edit,
  ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ChatHistoryListProps {
  onSelectHistory: (history: ChatHistory) => void;
  onNewChat: () => void;
  currentHistoryId?: string;
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({ 
  onSelectHistory, 
  onNewChat,
  currentHistoryId 
}) => {
  const { 
    histories, 
    loading, 
    error, 
    loadHistories, 
    deleteHistory,
    toggleStarred,
    searchHistories
  } = useChatHistory();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistories, setFilteredHistories] = useState<ChatHistory[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const { toast } = useToast();

  // Filter histories based on search query
  useEffect(() => {
    const filterHistories = async () => {
      if (!searchQuery.trim()) {
        setFilteredHistories(histories);
      } else {
        const results = await searchHistories(searchQuery);
        setFilteredHistories(results);
      }
    };
    
    filterHistories();
  }, [histories, searchQuery, searchHistories]);

  // Format date to display
  const formatDate = (date: Date) => {
    const now = new Date();
    const historyDate = new Date(date);
    
    // If it's today, show the time
    if (historyDate.toDateString() === now.toDateString()) {
      return historyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's within the last week, show the day
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    if (historyDate > oneWeekAgo) {
      return historyDate.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise, show the date
    return historyDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Handle renaming a chat history
  const handleRename = async (historyId: string, newTitle: string) => {
    try {
      // Import the service directly to avoid circular dependencies
      const chatHistoryService = (await import('@/services/chat/chatHistoryService')).default;
      
      // Get the history
      const history = await chatHistoryService.getChatHistory(historyId);
      
      if (!history) {
        throw new Error('History not found');
      }
      
      // Update the title
      await chatHistoryService.updateChatHistory(historyId, { title: newTitle });
      
      // Reload histories
      await loadHistories();
      
      // Show success message
      toast({
        title: 'Chat renamed',
        description: 'The chat history has been renamed successfully.',
      });
    } catch (error) {
      console.error('Error renaming chat history:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to rename chat',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsRenaming(null);
    }
  };

  // Export a chat history
  const handleExport = async (historyId: string) => {
    try {
      // Import the service directly to avoid circular dependencies
      const chatHistoryService = (await import('@/services/chat/chatHistoryService')).default;
      
      // Get the history
      const history = await chatHistoryService.getChatHistory(historyId);
      
      if (!history) {
        throw new Error('History not found');
      }
      
      // Convert to JSON
      const json = chatHistoryService.exportChatHistoryAsJson(history);
      
      // Create blob and download link
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_history_${history.id.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success message
      toast({
        title: 'Chat exported',
        description: 'The chat history has been exported successfully.',
      });
    } catch (error) {
      console.error('Error exporting chat history:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to export chat',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  // Handle importing a chat history
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    try {
      // Read the file
      const text = await file.text();
      
      // Import the history
      const chatHistoryService = (await import('@/services/chat/chatHistoryService')).default;
      const historyId = await chatHistoryService.importChatHistoryFromJson(text);
      
      if (!historyId) {
        throw new Error('Failed to import chat history');
      }
      
      // Reload histories
      await loadHistories();
      
      // Show success message
      toast({
        title: 'Chat imported',
        description: 'The chat history has been imported successfully.',
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error importing chat history:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to import chat',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  // File input ref for importing
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle toggling star status
  const handleToggleStar = async (historyId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await toggleStarred(historyId);
  };

  // Handle deleting a chat history
  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      const success = await deleteHistory(confirmDeleteId);
      
      if (success) {
        toast({
          title: 'Chat deleted',
          description: 'The chat history has been deleted successfully.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to delete chat',
          description: 'An error occurred while deleting the chat history.',
        });
      }
      
      setConfirmDeleteId(null);
    }
  };

  if (loading && histories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
        <p className="text-muted-foreground">Loading chat histories...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button 
          className="w-full mb-3 bg-primary hover:bg-primary/90 text-primary-foreground" 
          onClick={onNewChat}
          size="lg"
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          New Chat
        </Button>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chat history..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <span className="text-sm text-muted-foreground">
            {filteredHistories.length} {filteredHistories.length === 1 ? 'conversation' : 'conversations'}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Import Chat
              </DropdownMenuItem>
              {/* Hidden input for file selection */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImport}
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => loadHistories()}>
                <Clock className="mr-2 h-4 w-4" />
                Refresh List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {error && (
          <div className="p-3 text-sm text-destructive">
            Error: {error}
          </div>
        )}
        
        {filteredHistories.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredHistories.map((history) => (
              <div 
                key={history.id} 
                className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  currentHistoryId === history.id ? 'bg-muted' : ''
                }`}
                onClick={() => onSelectHistory(history)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-3 overflow-hidden">
                    <div className="font-medium truncate">{history.title}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(new Date(history.updatedAt))}
                      
                      {history.hasImages && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="ml-2 flex items-center">
                              <ImageIcon className="h-3 w-3 mr-1" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Contains images</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => handleToggleStar(history.id, e)}
                        >
                          <Star className={`h-4 w-4 ${history.isStarred ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {history.isStarred ? 'Unstar' : 'Star'}
                      </TooltipContent>
                    </Tooltip>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setNewTitle(history.title);
                          setIsRenaming(history.id);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleExport(history.id);
                        }}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(history.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="mt-1 text-xs truncate text-muted-foreground">
                  {history.summary || `${history.messages.length} messages`}
                </div>
                
                {history.tags && history.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {history.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat History</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename dialog */}
      <Dialog open={!!isRenaming} onOpenChange={(open) => !open && setIsRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat history.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Chat name"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => isRenaming && handleRename(isRenaming, newTitle)}
              disabled={!newTitle.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatHistoryList;