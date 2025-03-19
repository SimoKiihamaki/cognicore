
import { useState } from 'react';
import { Menu, Bell, MessageSquare } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleChat?: () => void;
  showChat?: boolean;
}

const Header = ({ 
  onToggleSidebar, 
  onToggleChat, 
  showChat = false 
}: HeaderProps) => {
  const [notificationsCount, setNotificationsCount] = useState(3);
  
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-2"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        {onToggleChat && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChat}
            className="hidden md:flex"
            aria-label={showChat ? "Hide chat" : "Show chat"}
          >
            <MessageSquare className={`w-5 h-5 ${showChat ? 'text-primary' : ''}`} />
            <span className="sr-only">{showChat ? "Hide chat" : "Show chat"}</span>
          </Button>
        )}
        
        <ThemeSwitcher />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              New updates available
            </DropdownMenuItem>
            <DropdownMenuItem>
              Knowledge graph updated
            </DropdownMenuItem>
            <DropdownMenuItem>
              Server connection established
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
