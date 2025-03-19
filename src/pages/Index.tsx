
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

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('chat');
  const { folderTree } = useFolders();
  const { notes } = useNotes();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'chat':
        return <ChatInterface />;
      case 'graph':
        return <GraphVisualization notes={notes} />;
      case 'editor':
        return <NoteEditor />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <ChatInterface />;
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
          <Header onToggleSidebar={toggleSidebar} />
          <main className="flex-1 overflow-hidden">
            {renderActiveSection()}
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default Index;
