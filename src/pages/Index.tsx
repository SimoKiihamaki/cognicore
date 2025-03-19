
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import GraphVisualization from '@/components/GraphVisualization';
import NoteEditor from '@/components/NoteEditor';
import SettingsPanel from '@/components/SettingsPanel';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import { Toaster } from '@/components/ui/sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('editor');
  const [chatOpen, setChatOpen] = useState(true);
  const { folderTree } = useFolders();
  const { notes } = useNotes();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'graph':
        return <GraphVisualization />;
      case 'editor':
        return <NoteEditor />;
      case 'settings':
        return <SettingsPanel />;
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
            chatOpen={chatOpen}
          />
          <main className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={chatOpen ? 70 : 100} minSize={30}>
                {renderActiveSection()}
              </ResizablePanel>
              
              {chatOpen && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <ChatInterface asSidebar />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default Index;
