import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Save, RotateCcw, Paintbrush, Check, Copy } from 'lucide-react';
import SettingsHeader from './SettingsHeader';
import SettingsSectionContainer from './SettingsSectionContainer';

// Define theme interface
export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  fontFamily: string;
  uiDensity: number; // 0 = compact, 1 = regular, 2 = spacious
}

// Default themes
const defaultDarkTheme: Theme = {
  id: 'default-dark',
  name: 'Default Dark',
  type: 'dark',
  colors: {
    background: '#171A1D',
    foreground: '#F8FAFC',
    card: '#202429',
    cardForeground: '#F8FAFC',
    popover: '#1A1D22',
    popoverForeground: '#F8FAFC',
    primary: '#3B82F6',
    primaryForeground: '#F8FAFC',
    secondary: '#25292F',
    secondaryForeground: '#F8FAFC',
    muted: '#2A2F37',
    mutedForeground: '#A4B2C5',
    accent: '#3B82F6',
    accentForeground: '#F8FAFC',
    destructive: '#DC2626',
    destructiveForeground: '#F8FAFC',
    border: '#384153',
    input: '#384153',
    ring: '#3B82F6',
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  uiDensity: 1,
};

const defaultLightTheme: Theme = {
  id: 'default-light',
  name: 'Default Light',
  type: 'light',
  colors: {
    background: '#FFFFFF',
    foreground: '#191C1F',
    card: '#FFFFFF',
    cardForeground: '#191C1F',
    popover: '#FFFFFF',
    popoverForeground: '#191C1F',
    primary: '#3B82F6',
    primaryForeground: '#FFFFFF',
    secondary: '#F4F7FB',
    secondaryForeground: '#191C1F',
    muted: '#F4F7FB',
    mutedForeground: '#666D80',
    accent: '#3B82F6',
    accentForeground: '#FFFFFF',
    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',
    border: '#E5E9EF',
    input: '#E5E9EF',
    ring: '#3B82F6',
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  uiDensity: 1,
};

// More theme presets
const discordDarkTheme: Theme = {
  id: 'discord-dark',
  name: 'Discord Dark',
  type: 'dark',
  colors: {
    background: '#202225',
    foreground: '#ffffff',
    card: '#2F3136',
    cardForeground: '#ffffff',
    popover: '#18191C',
    popoverForeground: '#ffffff',
    primary: '#5865F2',
    primaryForeground: '#ffffff',
    secondary: '#292B2F',
    secondaryForeground: '#ffffff',
    muted: '#36393F',
    mutedForeground: '#B9BBBE',
    accent: '#5865F2',
    accentForeground: '#ffffff',
    destructive: '#ED4245',
    destructiveForeground: '#ffffff',
    border: '#40444B',
    input: '#40444B',
    ring: '#5865F2',
  },
  fontFamily: 'gg sans, Noto Sans, Helvetica Neue, sans-serif',
  uiDensity: 1,
};

const obsidianDarkTheme: Theme = {
  id: 'obsidian-dark',
  name: 'Obsidian Dark',
  type: 'dark',
  colors: {
    background: '#1E1E1E',
    foreground: '#DCDDDE',
    card: '#2D2D2D',
    cardForeground: '#DCDDDE',
    popover: '#252525',
    popoverForeground: '#DCDDDE',
    primary: '#7B68EE',
    primaryForeground: '#FFFFFF',
    secondary: '#333333',
    secondaryForeground: '#DCDDDE',
    muted: '#3B3B3B',
    mutedForeground: '#A6A6A6',
    accent: '#9580FF',
    accentForeground: '#FFFFFF',
    destructive: '#E53935',
    destructiveForeground: '#FFFFFF',
    border: '#404040',
    input: '#404040',
    ring: '#7B68EE',
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  uiDensity: 1,
};

const cursorDarkTheme: Theme = {
  id: 'cursor-dark',
  name: 'Cursor Dark',
  type: 'dark',
  colors: {
    background: '#131313',
    foreground: '#FFFFFF',
    card: '#1F1F1F',
    cardForeground: '#FFFFFF',
    popover: '#191919',
    popoverForeground: '#FFFFFF',
    primary: '#0D99FF',
    primaryForeground: '#FFFFFF',
    secondary: '#242424',
    secondaryForeground: '#FFFFFF',
    muted: '#2A2A2A',
    mutedForeground: '#9CA3AF',
    accent: '#0D99FF',
    accentForeground: '#FFFFFF',
    destructive: '#F43F5E',
    destructiveForeground: '#FFFFFF',
    border: '#303030',
    input: '#303030',
    ring: '#0D99FF',
  },
  fontFamily: 'SF Mono, monospace',
  uiDensity: 0, // Compact
};

const softDarkTheme: Theme = {
  id: 'soft-dark',
  name: 'Soft Dark',
  type: 'dark',
  colors: {
    background: '#232136',
    foreground: '#E0DEF4',
    card: '#2A273F',
    cardForeground: '#E0DEF4',
    popover: '#232136',
    popoverForeground: '#E0DEF4',
    primary: '#C4A7E7',
    primaryForeground: '#232136',
    secondary: '#2A273F',
    secondaryForeground: '#E0DEF4',
    muted: '#393552',
    mutedForeground: '#908CAA',
    accent: '#EA9A97',
    accentForeground: '#232136',
    destructive: '#EB6F92',
    destructiveForeground: '#232136',
    border: '#44415A',
    input: '#44415A',
    ring: '#C4A7E7',
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  uiDensity: 1,
};

// Fonts options
const fontOptions = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Default)' },
  { value: 'SF Mono, monospace', label: 'SF Mono' },
  { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' },
  { value: 'gg sans, Noto Sans, Helvetica Neue, sans-serif', label: 'Discord Font' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

// Predefined themes array
const predefinedThemes = [
  defaultDarkTheme,
  defaultLightTheme,
  discordDarkTheme,
  obsidianDarkTheme,
  cursorDarkTheme,
  softDarkTheme,
];

const ThemeSettings = () => {
  // Local storage for themes and current active theme
  const [themes, setThemes] = useLocalStorage<Theme[]>(
    'cognicore-custom-themes',
    predefinedThemes
  );
  
  const [activeThemeId, setActiveThemeId] = useLocalStorage<string>(
    'cognicore-active-theme',
    'default-dark'
  );
  
  // Local state for the theme being edited
  const [currentTab, setCurrentTab] = useState('preset');
  const [editingTheme, setEditingTheme] = useState<Theme>(defaultDarkTheme);
  const [newThemeName, setNewThemeName] = useState('');
  const [colorPickerTarget, setColorPickerTarget] = useState<string | null>(null);
  const [showSuccessIndicator, setShowSuccessIndicator] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Initialize editing theme based on active theme
  useEffect(() => {
    const activeTheme = themes.find(theme => theme.id === activeThemeId) || defaultDarkTheme;
    setEditingTheme({ ...activeTheme });
  }, [activeThemeId, themes]);

  // Apply the active theme to the DOM
  useEffect(() => {
    const activeTheme = themes.find(theme => theme.id === activeThemeId);
    if (!activeTheme) return;
    
    applyThemeToDOM(activeTheme);
  }, [activeThemeId, themes]);

  // Apply theme to DOM
  const applyThemeToDOM = (theme: Theme) => {
    // Set CSS variables for colors
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    root.classList.add(theme.type);
    
    // Convert hex to HSL and set CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      const hsl = hexToHSL(value);
      if (hsl) {
        let cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        document.documentElement.style.setProperty(`--${cssKey}`, hsl);
      }
    });
    
    // Set font family
    document.documentElement.style.setProperty('--font-sans', theme.fontFamily);
    
    // Set UI density
    const densityScale = theme.uiDensity === 0 ? 0.9 : theme.uiDensity === 2 ? 1.1 : 1;
    document.documentElement.style.setProperty('--ui-scale', `${densityScale}`);
    
    // Update base size for spacing
    updateSpacingVariables(densityScale);
  };
  
  // Update spacing variables based on UI density
  const updateSpacingVariables = (scale: number) => {
    const baseSize = 4 * scale;
    const spacings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
    
    spacings.forEach((multiplier, index) => {
      document.documentElement.style.setProperty(`--space-${index}`, `${baseSize * multiplier}px`);
    });
  };

  // Convert hex color to HSL string
  const hexToHSL = (hex: string): string | null => {
    // Strip the # if present
    hex = hex.replace('#', '');
    
    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Find min and max
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Calculate lightness
    let l = (max + min) / 2;
    
    // If min and max are the same, it's a shade of gray
    if (max === min) {
      return `0deg 0% ${Math.round(l * 100)}%`;
    }
    
    // Calculate saturation
    let s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    
    // Calculate hue
    let h;
    if (max === r) {
      h = ((g - b) / (max - min)) + (g < b ? 6 : 0);
    } else if (max === g) {
      h = ((b - r) / (max - min)) + 2;
    } else {
      h = ((r - g) / (max - min)) + 4;
    }
    
    h = h * 60;
    
    return `${Math.round(h)}deg ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Handle color input change
  const handleColorChange = (colorKey: string, value: string) => {
    setEditingTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
  };

  // Handle theme type change
  const handleThemeTypeChange = (type: 'dark' | 'light') => {
    setEditingTheme(prev => ({
      ...prev,
      type
    }));
  };

  // Handle UI density change
  const handleDensityChange = (value: number[]) => {
    setEditingTheme(prev => ({
      ...prev,
      uiDensity: value[0]
    }));
  };

  // Handle font family change
  const handleFontChange = (value: string) => {
    setEditingTheme(prev => ({
      ...prev,
      fontFamily: value
    }));
  };

  // Save theme
  const saveCustomTheme = () => {
    if (!newThemeName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for your custom theme.",
        variant: "destructive"
      });
      return;
    }
    
    const newTheme: Theme = {
      ...editingTheme,
      id: `custom-${Date.now()}`,
      name: newThemeName
    };
    
    setThemes(prev => [...prev, newTheme]);
    setActiveThemeId(newTheme.id);
    setNewThemeName('');
    
    toast({
      title: "Theme saved",
      description: `${newTheme.name} has been saved and activated.`
    });
    
    // Switch to preset tab
    setCurrentTab('preset');
  };

  // Apply theme
  const applyTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    
    toast({
      title: "Theme applied",
      description: `${themes.find(t => t.id === themeId)?.name || 'Theme'} has been applied.`
    });
  };

  // Reset to default
  const resetToDefault = () => {
    const defaultType = editingTheme.type;
    const defaultTheme = defaultType === 'dark' ? defaultDarkTheme : defaultLightTheme;
    
    setEditingTheme({
      ...defaultTheme,
      id: editingTheme.id,
      name: editingTheme.name
    });
    
    toast({
      title: "Theme reset",
      description: "Theme settings have been reset to default values."
    });
  };

  // Delete custom theme
  const deleteCustomTheme = (themeId: string) => {
    // Check if it's a predefined theme
    const isPredefined = predefinedThemes.some(theme => theme.id === themeId);
    if (isPredefined) {
      toast({
        title: "Cannot delete",
        description: "Predefined themes cannot be deleted.",
        variant: "destructive"
      });
      return;
    }
    
    // Remove theme
    const updatedThemes = themes.filter(theme => theme.id !== themeId);
    setThemes(updatedThemes);
    
    // If active theme is deleted, switch to default
    if (activeThemeId === themeId) {
      const defaultTheme = defaultDarkTheme.id;
      setActiveThemeId(defaultTheme);
    }
    
    toast({
      title: "Theme deleted",
      description: "Custom theme has been deleted."
    });
  };

  // Copy color to clipboard
  const copyColorToClipboard = (color: string) => {
    navigator.clipboard.writeText(color).then(() => {
      // Show success indicator
      setShowSuccessIndicator(color);
      
      // Hide after 2 seconds
      setTimeout(() => {
        setShowSuccessIndicator(null);
      }, 2000);
    });
  };

  // Export theme as JSON
  const exportThemeAsJson = () => {
    const themeToExport = themes.find(theme => theme.id === activeThemeId);
    if (!themeToExport) return;
    
    const exportData = JSON.stringify(themeToExport, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${themeToExport.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Theme exported",
      description: "Your theme has been exported as a JSON file."
    });
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Theme Settings"
        description="Customize the appearance of the application"
        icon={<Paintbrush className="h-5 w-5" />}
      />
      
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset">Preset Themes</TabsTrigger>
          <TabsTrigger value="custom">Customize Theme</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preset" className="space-y-6 pt-4">
          <SettingsSectionContainer title="Available Themes" description="Select a theme to apply to the application">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map(theme => (
                <div 
                  key={theme.id}
                  className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${
                    activeThemeId === theme.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => applyTheme(theme.id)}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">{theme.name}</h4>
                    {activeThemeId === theme.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 text-xs text-muted-foreground">{theme.type}</div>
                    <div 
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: theme.colors.background }}
                    />
                    <div 
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-3">
                    {!predefinedThemes.some(t => t.id === theme.id) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomTheme(theme.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                    <Button 
                      variant={activeThemeId === theme.id ? "secondary" : "default"} 
                      size="sm"
                    >
                      {activeThemeId === theme.id ? 'Active' : 'Apply'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer title="Theme Export" description="Export the current theme as a JSON file">
            <Button onClick={exportThemeAsJson}>
              Export Current Theme
            </Button>
          </SettingsSectionContainer>
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-6 pt-4">
          <SettingsSectionContainer title="Theme Basics" description="Set the basic properties of your theme">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="theme-type">Theme Type</Label>
                <RadioGroup 
                  id="theme-type"
                  value={editingTheme.type}
                  onValueChange={(value) => handleThemeTypeChange(value as 'dark' | 'light')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark">Dark</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light">Light</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="theme-font">Font Family</Label>
                <Select 
                  value={editingTheme.fontFamily}
                  onValueChange={handleFontChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map(font => (
                      <SelectItem 
                        key={font.value} 
                        value={font.value}
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <Label htmlFor="ui-density">UI Density</Label>
                  <span className="text-sm text-muted-foreground">
                    {editingTheme.uiDensity === 0 ? 'Compact' : 
                     editingTheme.uiDensity === 1 ? 'Regular' : 'Spacious'}
                  </span>
                </div>
                <Slider
                  id="ui-density"
                  min={0}
                  max={2}
                  step={1}
                  value={[editingTheme.uiDensity]}
                  onValueChange={handleDensityChange}
                />
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer title="Colors" description="Customize the color palette of your theme">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(editingTheme.colors).map(([key, value]) => (
                  <div key={key} className="grid gap-2">
                    <Label 
                      htmlFor={`color-${key}`}
                      className="flex justify-between items-center"
                    >
                      <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: value }}
                        />
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => copyColorToClipboard(value)}
                        >
                          {showSuccessIndicator === value ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`color-${key}`}
                        type="color"
                        value={value}
                        onChange={e => handleColorChange(key, e.target.value)}
                        className="w-12 h-8 p-1"
                      />
                      <Input
                        type="text"
                        value={value}
                        onChange={e => handleColorChange(key, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SettingsSectionContainer>
          
          <SettingsSectionContainer title="Save Custom Theme" description="Save your customizations as a new theme">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  type="text"
                  placeholder="My Custom Theme"
                  value={newThemeName}
                  onChange={e => setNewThemeName(e.target.value)}
                />
              </div>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={resetToDefault}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
                <Button 
                  onClick={saveCustomTheme}
                  className="flex items-center gap-1"
                  disabled={!newThemeName.trim()}
                >
                  <Save className="h-4 w-4" />
                  Save Custom Theme
                </Button>
              </div>
            </div>
          </SettingsSectionContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Safer export to prevent rendering issues
export { ThemeSettings as default };
