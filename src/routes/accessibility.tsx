/**
 * Accessibility Demo Page
 * 
 * Demonstrates the accessibility features implemented in Phase 4,
 * including keyboard shortcuts, focus management, and keyboard navigation patterns.
 */

import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import KeyboardShortcutList from '@/components/accessibility/KeyboardShortcutList';
import FocusTrapDemo from '@/components/accessibility/FocusTrapDemo';
import { useKeyboardShortcuts } from '@/providers/accessibility/KeyboardShortcutsProvider';
import { KeyboardShortcutsDialogProvider } from '@/components/accessibility/KeyboardShortcutsDialog';

/**
 * Page component for demonstrating accessibility features
 */
const AccessibilityPage: React.FC = () => {
  const keyboardShortcuts = useKeyboardShortcuts();
  
  // Register page-specific shortcuts
  useEffect(() => {
    // Add the accessibility page scope
    keyboardShortcuts.addScope('accessibility-page');
    
    // Register page-specific shortcuts
    const ids = [
      keyboardShortcuts.registerShortcut({
        description: 'Toggle keyboard shortcuts tab',
        keys: { key: '1', alt: true },
        callback: () => {
          const keyboardTab = document.querySelector('[data-value="keyboard"]');
          if (keyboardTab) {
            (keyboardTab as HTMLElement).click();
          }
        },
        scope: 'accessibility-page',
        priority: 90,
        preventDefault: true
      }),
      keyboardShortcuts.registerShortcut({
        description: 'Toggle focus management tab',
        keys: { key: '2', alt: true },
        callback: () => {
          const focusTab = document.querySelector('[data-value="focus"]');
          if (focusTab) {
            (focusTab as HTMLElement).click();
          }
        },
        scope: 'accessibility-page',
        priority: 90,
        preventDefault: true
      }),
      keyboardShortcuts.registerShortcut({
        description: 'Show help section',
        keys: { key: 'h', alt: true },
        callback: () => {
          const helpSection = document.getElementById('help-section');
          if (helpSection) {
            helpSection.scrollIntoView({ behavior: 'smooth' });
          }
        },
        scope: 'accessibility-page',
        priority: 90,
        preventDefault: true
      })
    ];
    
    // Clean up on unmount
    return () => {
      ids.forEach(id => keyboardShortcuts.unregisterShortcut(id));
      keyboardShortcuts.removeScope('accessibility-page');
    };
  }, [keyboardShortcuts]);
  
  // Show available keyboard shortcuts
  const handleShowShortcuts = () => {
    keyboardShortcuts.showShortcutsDialog();
  };
  
  return (
    <KeyboardShortcutsDialogProvider>
      <Layout>
        <div className="container py-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Accessibility Features</h1>
            <p className="text-muted-foreground mb-6">
              Demonstrations of the accessibility features implemented in Phase 4
            </p>
          </div>
          
          <Tabs defaultValue="keyboard">
            <TabsList className="mb-4">
              <TabsTrigger value="keyboard" data-value="keyboard">Keyboard Shortcuts</TabsTrigger>
              <TabsTrigger value="focus" data-value="focus">Focus Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="keyboard">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <KeyboardShortcutList height="500px" />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Using Keyboard Shortcuts</CardTitle>
                    <CardDescription>
                      How to use keyboard shortcuts to navigate and interact with the application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>
                      The application supports various keyboard shortcuts for faster navigation and
                      actions. These shortcuts are context-sensitive and change based on the current
                      view or component.
                    </p>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Global Shortcuts</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Press <kbd className="px-1 rounded border">Shift + ?</kbd> to view all keyboard shortcuts</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + H</kbd> to navigate to the home page</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + C</kbd> to navigate to the chat page</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + G</kbd> to navigate to the graph page</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + E</kbd> to navigate to the editor page</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + S</kbd> to navigate to the settings page</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + P</kbd> to navigate to the performance page</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Page-Specific Shortcuts</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Press <kbd className="px-1 rounded border">Alt + 1</kbd> to switch to the Keyboard Shortcuts tab</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + 2</kbd> to switch to the Focus Management tab</li>
                        <li>Press <kbd className="px-1 rounded border">Alt + H</kbd> to scroll to the help section</li>
                      </ul>
                    </div>
                    
                    <Button onClick={handleShowShortcuts}>
                      Show All Shortcuts
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="focus">
              <FocusTrapDemo />
            </TabsContent>
          </Tabs>
          
          <Separator />
          
          <div id="help-section" className="space-y-4">
            <h2 className="text-2xl font-bold">Accessibility Help</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Keyboard Navigation Tips</CardTitle>
                <CardDescription>
                  How to navigate the application using only the keyboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Basic Navigation</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Press <kbd className="px-1 rounded border">Tab</kbd> to move focus to the next interactive element</li>
                    <li>Press <kbd className="px-1 rounded border">Shift + Tab</kbd> to move focus to the previous interactive element</li>
                    <li>Press <kbd className="px-1 rounded border">Enter</kbd> or <kbd className="px-1 rounded border">Space</kbd> to activate the focused element</li>
                    <li>Press <kbd className="px-1 rounded border">Escape</kbd> to close dialogs, menus, or exit focus traps</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Interactive Lists</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use <kbd className="px-1 rounded border">↑</kbd> and <kbd className="px-1 rounded border">↓</kbd> to navigate through list items</li>
                    <li>Press <kbd className="px-1 rounded border">Home</kbd> to go to the first item in a list</li>
                    <li>Press <kbd className="px-1 rounded border">End</kbd> to go to the last item in a list</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Form Controls</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>For checkboxes and radio buttons, use <kbd className="px-1 rounded border">Space</kbd> to toggle selection</li>
                    <li>For sliders, use <kbd className="px-1 rounded border">←</kbd> and <kbd className="px-1 rounded border">→</kbd> to adjust values</li>
                    <li>For dropdown menus, use <kbd className="px-1 rounded border">↑</kbd> and <kbd className="px-1 rounded border">↓</kbd> to navigate options, and <kbd className="px-1 rounded border">Enter</kbd> to select</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Screen Reader Support</CardTitle>
                <CardDescription>
                  Information about screen reader compatibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  This application has been designed to work with screen readers. We've implemented
                  ARIA attributes, semantic HTML, and proper focus management to ensure a good
                  experience for users with screen readers.
                </p>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Tips for Screen Reader Users</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use heading navigation to quickly move between sections</li>
                    <li>Use landmark navigation to move between major areas of the application</li>
                    <li>Dialog content is properly labeled and focused for screen reader users</li>
                    <li>Interactive elements have appropriate ARIA roles and states</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </KeyboardShortcutsDialogProvider>
  );
};

export default AccessibilityPage;
