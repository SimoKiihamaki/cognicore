import { useState } from 'react';
import { Settings, User, Paintbrush, Database, FolderCog } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"

import AppearanceSettings from './AppearanceSettings';
import LMStudioSettings from './LMStudioSettings';
import FolderMonitorSettings from './FolderMonitorSettings';
import CacheSettings from './CacheSettings';
import SafeThemeSettings from './SafeThemeSettings';

const SettingsPanel = () => {
  const [expandedPanels, setExpandedPanels] = useState<string[]>([]);

  const handlePanelToggle = (panelId: string) => {
    setExpandedPanels((prevExpanded) =>
      prevExpanded.includes(panelId)
        ? prevExpanded.filter((id) => id !== panelId)
        : [...prevExpanded, panelId]
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <Accordion type="multiple" defaultValue={expandedPanels} className="w-full">
          <AccordionItem value="appearance" >
            <AccordionTrigger className="data-[state=open]:text-foreground" id="appearance-settings">
              <Paintbrush className="mr-2 h-4 w-4" />
              Appearance
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <AppearanceSettings />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lm-studio">
            <AccordionTrigger className="data-[state=open]:text-foreground" id="lm-studio-settings">
              <Settings className="mr-2 h-4 w-4" />
              LM Studio
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <LMStudioSettings />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="folder-monitor">
            <AccordionTrigger className="data-[state=open]:text-foreground" id="folder-monitor-settings">
              <FolderCog className="mr-2 h-4 w-4" />
              Folder Monitor
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <FolderMonitorSettings />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cache">
            <AccordionTrigger className="data-[state=open]:text-foreground" id="cache-settings">
              <Database className="mr-2 h-4 w-4" />
              Cache
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <CacheSettings />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="theme">
            <AccordionTrigger className="data-[state=open]:text-foreground" id="theme-settings">
              <Paintbrush className="mr-2 h-4 w-4" />
              Theme
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <SafeThemeSettings />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
};

export default SettingsPanel;
