/**
 * Keyboard Shortcuts Dialog
 * 
 * Modal dialog that displays all available keyboard shortcuts.
 * Can be accessed via the '?' keyboard shortcut.
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import KeyboardShortcutList from './KeyboardShortcutList';
import { useKeyboardShortcuts } from '@/providers/accessibility/KeyboardShortcutsProvider';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog that displays all available keyboard shortcuts
 */
const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Available keyboard shortcuts for faster navigation and actions
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <KeyboardShortcutList height="400px" />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow">?</kbd> at any time to show this dialog.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * A component that provides a keyboard shortcuts dialog
 * that can be triggered by the '?' key.
 */
export const KeyboardShortcutsDialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [open, setOpen] = React.useState(false);
  const keyboardShortcuts = useKeyboardShortcuts();
  
  // Register the '?' shortcut
  React.useEffect(() => {
    const id = keyboardShortcuts.registerShortcut({
      description: 'Show Keyboard Shortcuts Dialog',
      keys: { key: '?', shift: true },
      callback: () => setOpen(true),
      scope: 'global',
      priority: 100,
      preventDefault: true
    });
    
    return () => {
      keyboardShortcuts.unregisterShortcut(id);
    };
  }, [keyboardShortcuts]);
  
  return (
    <>
      {children}
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default KeyboardShortcutsDialog;
