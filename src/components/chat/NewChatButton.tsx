import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface NewChatButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  fullWidth?: boolean;
}

/**
 * A standalone button to create a new chat, designed to be used across the application
 */
const NewChatButton: React.FC<NewChatButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  fullWidth = false,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNewChat = () => {
    try {
      // Navigate to chat page with new=true parameter
      navigate('/chat?new=true');
      
      // Show a toast confirmation
      toast({
        title: 'Creating new chat',
        description: 'Starting a fresh conversation...',
      });
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create new chat'
      });
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={handleNewChat}
    >
      <PlusCircle className="mr-2 h-4 w-4" />
      New Chat
    </Button>
  );
};

export default NewChatButton;
