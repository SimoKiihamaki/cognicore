
import React from 'react';
import SettingsHeader from './SettingsHeader';
import { Paintbrush } from 'lucide-react';

// This is a safe fallback component if ThemeSettings has errors
const SafeThemeSettings = () => {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Theme Settings"
        description="Theme customization is temporarily unavailable"
        icon={<Paintbrush className="h-5 w-5" />}
      />
      
      <div className="rounded-md bg-yellow-500/10 p-6 border border-yellow-500/30">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-yellow-500"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <path d="M12 9v4"></path>
            <path d="M12 17h.01"></path>
          </svg>
          <h3 className="text-lg font-medium text-foreground">Theme Settings Unavailable</h3>
          <p className="text-muted-foreground">
            There was an error loading the theme customization settings. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('cognicore-custom-themes');
              localStorage.removeItem('cognicore-active-theme');
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reset Theme Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafeThemeSettings;
