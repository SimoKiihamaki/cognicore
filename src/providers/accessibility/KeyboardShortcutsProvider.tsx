/**
 * Keyboard Shortcuts Provider
 * 
 * Provides global keyboard shortcuts functionality to the application.
 * Manages registration, scoping, and execution of keyboard shortcuts.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import keyboardManager, { KeyboardShortcut, KeyCombination } from '@/utils/accessibility/KeyboardManager';
import { useToast } from '@/components/ui/use-toast';

// Context type
interface KeyboardShortcutsContextType {
  registerShortcut: (shortcut: Omit<KeyboardShortcut, 'id'>) => string;
  unregisterShortcut: (id: string) => void;
  setShortcutDisabled: (id: string, disabled: boolean) => void;
  addScope: (scope: string) => void;
  removeScope: (scope: string) => void;
  setScopes: (scopes: string[]) => void;
  getShortcuts: () => KeyboardShortcut[];
  getActiveScopes: () => string[];
  showShortcutsDialog: () => void;
}

// Create context
const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

// Default global shortcuts
const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'id'>[] = [
  {
    description: 'Show keyboard shortcuts',
    keys: { key: '?', shift: true },
    callback: () => {},
    priority: 100,
    scope: 'global',
    preventDefault: true
  },
  {
    description: 'Go to Home',
    keys: { key: 'h', alt: true },
    callback: () => {},
    priority: 90,
    scope: 'global',
    preventDefault: true
  },
  {
    description: 'Go to Chat',
    keys: { key: 'c', alt: true },
    callback: () => {},
    priority: 90,
    scope: 'global',
    preventDefault: true
  },
  {
    description: 'Go to Graph',
    keys: { key: 'g', alt: true },
    callback: () => {},
    priority: 90,
    scope: 'global',
    preventDefault: true
  },
  {
    description: 'Go to Editor',
    keys: { key: 'e', alt: true },
    callback: () => {},
    priority: 90,
    scope: 'global',
    preventDefault: true
  },
  {
    description: 'Go to Settings',
    keys: { key: 's', alt: true },
    callback: () => {},
    priority: 90,
    scope: 'global',
    preventDefault: true
  },
  {
    description: 'Go to Performance',
    keys: { key: 'p', alt: true },
    callback: () => {},
    priority: 90,
    scope: 'global',
    preventDefault: true
  }
];

// Provider props
interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  initialScopes?: string[];
}

/**
 * Provider that manages keyboard shortcuts
 */
export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children,
  initialScopes = ['global']
}) => {
  // State for tracking registered shortcut IDs for cleanup
  const [shortcutIds, setShortcutIds] = useState<string[]>([]);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  
  // Hooks
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Register default shortcuts on mount
  useEffect(() => {
    // Set initial scopes
    keyboardManager.setScopes(initialScopes);
    
    // Register default shortcuts with navigation
    const ids = DEFAULT_SHORTCUTS.map(shortcut => {
      // Create a copy of the shortcut
      const shortcutCopy = { ...shortcut };
      
      // Update callback based on description
      if (shortcut.description === 'Show keyboard shortcuts') {
        shortcutCopy.callback = () => setShortcutsDialogOpen(true);
      } else if (shortcut.description === 'Go to Home') {
        shortcutCopy.callback = () => navigate('/');
      } else if (shortcut.description === 'Go to Chat') {
        shortcutCopy.callback = () => navigate('/chat');
      } else if (shortcut.description === 'Go to Graph') {
        shortcutCopy.callback = () => navigate('/graph');
      } else if (shortcut.description === 'Go to Editor') {
        shortcutCopy.callback = () => navigate('/editor');
      } else if (shortcut.description === 'Go to Settings') {
        shortcutCopy.callback = () => navigate('/settings');
      } else if (shortcut.description === 'Go to Performance') {
        shortcutCopy.callback = () => navigate('/performance');
      }
      
      return keyboardManager.registerShortcut(shortcutCopy);
    });
    
    // Save IDs for cleanup
    setShortcutIds(ids);
    
    // Clean up on unmount
    return () => {
      ids.forEach(id => keyboardManager.unregisterShortcut(id));
    };
  }, [navigate]);
  
  // Register a keyboard shortcut
  const registerShortcut = (shortcut: Omit<KeyboardShortcut, 'id'>): string => {
    const id = keyboardManager.registerShortcut(shortcut);
    setShortcutIds(prev => [...prev, id]);
    return id;
  };
  
  // Unregister a keyboard shortcut
  const unregisterShortcut = (id: string): void => {
    keyboardManager.unregisterShortcut(id);
    setShortcutIds(prev => prev.filter(shortcutId => shortcutId !== id));
  };
  
  // Enable or disable a shortcut
  const setShortcutDisabled = (id: string, disabled: boolean): void => {
    keyboardManager.setShortcutDisabled(id, disabled);
  };
  
  // Add a scope
  const addScope = (scope: string): void => {
    keyboardManager.addScope(scope);
  };
  
  // Remove a scope
  const removeScope = (scope: string): void => {
    keyboardManager.removeScope(scope);
  };
  
  // Set active scopes
  const setScopes = (scopes: string[]): void => {
    keyboardManager.setScopes(scopes);
  };
  
  // Get all shortcuts
  const getShortcuts = (): KeyboardShortcut[] => {
    return keyboardManager.getShortcuts();
  };
  
  // Get active scopes
  const getActiveScopes = (): string[] => {
    // Not directly exposed by keyboardManager, so we define our own implementation
    // This would be extended if we expose activeScopes from keyboardManager
    return ['global'];
  };
  
  // Show shortcuts dialog
  const showShortcutsDialog = (): void => {
    setShortcutsDialogOpen(true);
  };
  
  // Provider value
  const value: KeyboardShortcutsContextType = {
    registerShortcut,
    unregisterShortcut,
    setShortcutDisabled,
    addScope,
    removeScope,
    setScopes,
    getShortcuts,
    getActiveScopes,
    showShortcutsDialog
  };
  
  // Toast when keyboard shortcut dialog state changes
  useEffect(() => {
    if (shortcutsDialogOpen) {
      toast({
        title: "Keyboard Shortcuts",
        description: "Press '?' to view keyboard shortcuts",
        duration: 3000,
      });
    }
  }, [shortcutsDialogOpen, toast]);
  
  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      
      {/* Keyboard Shortcuts Dialog would be rendered here */}
      {/* For simplicity, we're just showing a toast for now */}
    </KeyboardShortcutsContext.Provider>
  );
};

// Hook for using keyboard shortcuts context
export const useKeyboardShortcuts = (): KeyboardShortcutsContextType => {
  const context = useContext(KeyboardShortcutsContext);
  
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  
  return context;
};
