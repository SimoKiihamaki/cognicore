
import { Menu } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header = ({ onToggleSidebar }: HeaderProps) => {
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10 animate-fade-in">
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-lg mr-2 button-hover-effect md:hidden focus-ring"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <h1 className="text-lg font-semibold tracking-tight">Lean Reor</h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <ThemeSwitcher />
      </div>
    </header>
  );
};

export default Header;
