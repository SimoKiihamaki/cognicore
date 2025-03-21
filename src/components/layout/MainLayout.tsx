import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import EnhancedChatInterface from '@/components/chat/EnhancedChatInterface';

/**
 * Main layout component that provides consistent navigation and UI
 * across all routes.
 */
const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const location = useLocation();
  
  // Determine active section from path
  const getActiveSection = () => {
    const path = location.pathname;
    if (path.startsWith('/editor')) return 'editor';
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/vision-chat')) return 'vision-chat';
    if (path.startsWith('/graph')) return 'graph';
    if (path.startsWith('/settings')) return 'settings';
    return 'editor';
  };
  
  // Handle navigation from sidebar
  const handleSectionChange = (section: string) => {
    // This will be handled by the Sidebar component now
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex h-full overflow-hidden">
        {/* Sidebar with proper positioning */}
        <div className={`w-64 shrink-0 ${sidebarOpen ? 'md:block' : 'hidden'}`}>
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            activeSection={getActiveSection()}
            onSectionChange={handleSectionChange}
          />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onToggleChat={() => setShowChat(!showChat)}
            showChat={showChat}
          />
          
          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={75} minSize={30}>
                {/* This is where the content from routes will be rendered */}
                <div className="h-full overflow-auto">
                  <Outlet />
                </div>
              </ResizablePanel>
              
              {/* Only show side chat if not on any chat routes */}
              {showChat && 
                !location.pathname.startsWith('/chat') && 
                !location.pathname.startsWith('/vision-chat') && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                    <div className="h-full border-l border-border" id="sidebar-chat-container">
                      {/* Using a key to ensure clean remount if needed */}
                      <EnhancedChatInterface key="sidebar-chat" />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;