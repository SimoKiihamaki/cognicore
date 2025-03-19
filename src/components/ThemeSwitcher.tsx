
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const ThemeSwitcher = () => {
  const [theme, setTheme] = useLocalStorage('theme', 'dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'light') {
      document.documentElement.style.setProperty('--background', '0 0% 100%');
      document.documentElement.style.setProperty('--foreground', '220 14% 10%');
      document.documentElement.style.setProperty('--card', '0 0% 100%');
      document.documentElement.style.setProperty('--card-foreground', '220 14% 10%');
      document.documentElement.style.setProperty('--popover', '0 0% 100%');
      document.documentElement.style.setProperty('--popover-foreground', '220 14% 10%');
      document.documentElement.style.setProperty('--primary', '217 91% 60%');
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--secondary', '210 20% 96%');
      document.documentElement.style.setProperty('--secondary-foreground', '220 14% 10%');
      document.documentElement.style.setProperty('--muted', '210 20% 96%');
      document.documentElement.style.setProperty('--muted-foreground', '220 14% 40%');
      document.documentElement.style.setProperty('--accent', '217 91% 60%');
      document.documentElement.style.setProperty('--accent-foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--destructive', '0 62% 50%');
      document.documentElement.style.setProperty('--destructive-foreground', '0 0% 100%');
      document.documentElement.style.setProperty('--border', '220 14% 90%');
      document.documentElement.style.setProperty('--input', '220 14% 90%');
      document.documentElement.style.setProperty('--ring', '217 91% 60%');
    }
    
    root.classList.add(theme);
  }, [theme]);

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-full button-hover-effect focus-ring"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-foreground" />
      ) : (
        <Moon className="w-5 h-5 text-foreground" />
      )}
    </button>
  );
};

export default ThemeSwitcher;
