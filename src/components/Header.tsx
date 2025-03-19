
import { Menu, ChevronLeft, MessageSquare } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
}

const Header = ({ onToggleSidebar, onToggleChat, chatOpen }: HeaderProps) => {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mr-2" 
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <h1 className="text-lg font-semibold">CogniCore</h1>
      </div>
      <div className="flex items-center space-x-2">
        <ThemeSwitcher />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleChat}
                className="relative"
              >
                {chatOpen ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
                <span className="sr-only">
                  {chatOpen ? 'Hide chat' : 'Show chat'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {chatOpen ? 'Hide chat' : 'Show chat'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
};

export default Header;
