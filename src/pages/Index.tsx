
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import GraphVisualization from '@/components/GraphVisualization';
import NoteEditor from '@/components/NoteEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ServerConfig from '@/components/ServerConfig';
import { Toaster } from '@/components/ui/sonner';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('editor');
  const { folderTree } = useFolders();
  const { notes } = useNotes();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
          />
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
