
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Settings } from '@/lib/types';
import SettingsHeader from './settings/SettingsHeader';
import SettingsSectionContainer from './settings/SettingsSectionContainer';
import LMStudioConnection from './settings/LMStudioConnection';
import ModelsConfig from './settings/ModelsConfig';
import ContentOrganization from './settings/ContentOrganization';

const SettingsPanel = () => {
  const [settings, setSettings] = useLocalStorage<Settings>('cognicore-settings', {
    lmStudioBaseUrl: 'http://localhost:1234/v1',
    lmStudioApiKey: '',
    primaryModelName: 'Meta-Llama-3-8B-Instruct',
    secondaryModelName: 'Phi-3-mini-4k-instruct',
    folderPaths: [],
    similarityThreshold: 0.75,
    autoOrganizeNotes: false,
    embeddingModelName: 'Xenova/all-MiniLM-L6-v2'
  });
  
  const handleInputChange = (field: keyof Settings, value: any) => {
    setSettings({
      ...settings,
      [field]: value
    });
  };
  
  return (
    <div className="h-full flex flex-col overflow-auto scrollbar-thin">
      <SettingsHeader />
      
      <SettingsSectionContainer>
        <LMStudioConnection 
          settings={settings} 
          onUpdateSettings={handleInputChange} 
        />
        
        <ModelsConfig 
          settings={settings} 
          onUpdateSettings={handleInputChange} 
        />
        
        <ContentOrganization 
          settings={settings} 
          onUpdateSettings={handleInputChange} 
        />
      </SettingsSectionContainer>
    </div>
  );
};

export default SettingsPanel;
