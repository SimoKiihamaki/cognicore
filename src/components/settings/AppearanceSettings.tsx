
import React from 'react';
import SettingsHeader from './SettingsHeader';
import SettingsSectionContainer from './SettingsSectionContainer';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Paintbrush } from 'lucide-react';

const AppearanceSettings = () => {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Appearance Settings"
        description="Customize the look and feel of the application"
        icon={<Paintbrush className="h-5 w-5" />}
      />
      
      <SettingsSectionContainer 
        title="Display Options" 
        description="Adjust how the application displays content"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compact-mode">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Reduces spacing and sizing of UI elements</p>
            </div>
            <Switch id="compact-mode" />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="large-text">Large Text</Label>
              <p className="text-sm text-muted-foreground">Increases font size across the application</p>
            </div>
            <Switch id="large-text" />
          </div>
        </div>
      </SettingsSectionContainer>
      
      <SettingsSectionContainer 
        title="Animations" 
        description="Control motion and animation effects"
      >
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reduced-motion">Reduced Motion</Label>
            <p className="text-sm text-muted-foreground">Minimizes animation for accessibility</p>
          </div>
          <Switch id="reduced-motion" />
        </div>
      </SettingsSectionContainer>
    </div>
  );
};

export default AppearanceSettings;
