
import React from 'react';
import SettingsHeader from './SettingsHeader';
import SettingsSectionContainer from './SettingsSectionContainer';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';

const CacheSettings = () => {
  const [cacheSize, setCacheSize] = React.useState(50);
  
  const handleClearCache = () => {
    console.log('Clearing cache...');
    // Implementation would go here
  };
  
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Cache Settings"
        description="Manage application cache and storage"
        icon={<Database className="h-5 w-5" />}
      />
      
      <SettingsSectionContainer
        title="Cache Size"
        description="Control how much storage the application can use for caching"
      >
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <Label htmlFor="cache-size">Maximum Cache Size: {cacheSize} MB</Label>
            </div>
            <Slider
              id="cache-size"
              defaultValue={[cacheSize]}
              max={500}
              min={10}
              step={10}
              onValueChange={(value) => setCacheSize(value[0])}
            />
          </div>
        </div>
      </SettingsSectionContainer>
      
      <SettingsSectionContainer
        title="Cache Management"
        description="Clear cached data to free up space"
      >
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Clear All Cached Data</p>
            <p className="text-sm text-muted-foreground">Remove all temporarily stored files and data</p>
          </div>
          <Button variant="destructive" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>
      </SettingsSectionContainer>
    </div>
  );
};

export default CacheSettings;
