import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '@/providers/NotificationsProvider';
import { Menu, Bell, MessageSquare, Search, PlusCircle, History } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import OfflineIndicator from './OfflineIndicator';
import { ImportExportMenu } from './import-export';
import { Icons } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NewChatButton from './chat/NewChatButton';
import ChatHistorySidebar from './chat/ChatHistorySidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      navigate(`/graph?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/editor')) return 'Editor';
    if (path.startsWith('/chat')) return 'Chat';
    if (path.startsWith('/graph')) return 'Knowledge Graph';
    if (path.startsWith('/settings')) return 'Settings';
    return 'CogniCore';
  };
  
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
        
        <h1 className="text-lg font-semibold mr-4">{getPageTitle()}</h1>
        
        <form onSubmit={handleSearch} className="hidden md:flex items-center max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes..."
              className="pl-8 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>
      
      <div className="flex items-center space-x-2">
        <ImportExportMenu />
        
        {/* Chat History Sidebar */}
        <ChatHistorySidebar>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            aria-label="Chat History"
          >
            <History className="w-5 h-5" />
            <span className="sr-only">Chat History</span>
          </Button>
        </ChatHistorySidebar>
        
        {/* New Chat Button - Always visible in the header */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex gap-1"
          onClick={() => navigate('/chat?new=true')}
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
        
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
        
        {/* This button is redundant with the New Chat button above, so only show it on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/chat')}
          className={`md:hidden ${location.pathname === '/chat' ? 'text-primary' : ''}`}
        >
          <Icons.messageCircle className="w-5 h-5" />
          <span className="sr-only">Chat</span>
        </Button>
        
        <OfflineIndicator />
        <ThemeSwitcher />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto w-80">
            {notifications.length > 0 ? (
              <>
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onSelect={() => {
                      markAsRead(notification.id);
                      if (notification.actionRoute) {
                        navigate(notification.actionRoute);
                      }
                    }}
                    className={`py-2 flex flex-col items-start ${!notification.read ? 'bg-muted/40' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground truncate max-w-full">{notification.message}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => markAllAsRead()}
                  className="justify-center"
                >
                  Mark all as read
                </DropdownMenuItem>
              </>
            ) : (
              <div className="py-4 px-2 text-center text-muted-foreground">
                No notifications
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
