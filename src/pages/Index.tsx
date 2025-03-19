
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import GraphVisualization from '@/components/GraphVisualization';
import NoteEditor from '@/components/NoteEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ServerConfig from '@/components/ServerConfig';
import ChatInterface from '@/components/ChatInterface';
import { Toaster } from '@/components/ui/sonner';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('editor');
  const [showChat, setShowChat] = useState(true);
  const { folderTree } = useFolders();
  const { notes } = useNotes();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'graph':
        return <GraphVisualization />;
      case 'editor':
        return <NoteEditor />;
      case 'settings':
        return <SettingsPanel />;
      case 'server-config':
        return <ServerConfig />;
      default:
        return <NoteEditor />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex h-full">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          activeSection={activeSection}
          onSectionChange={setActiveSection} 
        />
        
        <div className="flex-1 flex flex-col h-full md:ml-64">
          <Header 
            onToggleSidebar={toggleSidebar}
            onToggleChat={toggleChat}
            showChat={showChat}
          />
          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={75} minSize={30}>
                <main className="h-full overflow-auto">
                  {renderActiveSection()}
                </main>
              </ResizablePanel>
              
              {showChat && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                    <div className="h-full border-l border-border">
                      <ChatInterface />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default Index;
