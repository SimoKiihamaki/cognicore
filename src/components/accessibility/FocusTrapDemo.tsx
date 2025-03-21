/**
 * Focus Trap Demo Component
 * 
 * Demonstrates focus management capabilities with focus trapping in modals,
 * focus restoration, and keyboard navigation patterns.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import focusManager from '@/utils/accessibility/FocusManager';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Component demonstrating focus trap capabilities
 */
const FocusTrapDemo: React.FC = () => {
  // Component state
  const [trapActive, setTrapActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previousFocus, setPreviousFocus] = useState<HTMLElement | null>(null);
  
  // References to containers
  const trapContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLUListElement>(null);
  
  // State for roving tabindex demo
  const [rovingHandler, setRovingHandler] = useState<any>(null);
  
  // Set up focus trap
  useEffect(() => {
    if (trapContainerRef.current && trapActive) {
      // Save current focus
      setPreviousFocus(document.activeElement as HTMLElement);
      
      // Create and activate focus trap
      const trapId = focusManager.createFocusTrap(trapContainerRef.current, {
        escapeDeactivates: true,
        returnFocusOnDeactivate: true
      });
      
      focusManager.activateFocusTrap(trapId);
      
      // Clean up when component unmounts or trap deactivates
      return () => {
        focusManager.removeFocusTrap(trapId);
        focusManager.restoreFocus(previousFocus);
      };
    }
  }, [trapActive, previousFocus]);
  
  // Set up roving tabindex for list
  useEffect(() => {
    if (listContainerRef.current) {
      const handler = focusManager.createRovingTabindex(
        listContainerRef.current,
        'li'
      );
      
      handler.init();
      setRovingHandler(handler);
      
      // Add keyboard listener to container
      listContainerRef.current.addEventListener('keydown', handler.handleKeyDown);
      
      return () => {
        if (listContainerRef.current) {
          listContainerRef.current.removeEventListener('keydown', handler.handleKeyDown);
        }
      };
    }
  }, []);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accessibility Enhancements</CardTitle>
        <CardDescription>
          Demonstrations of focus management and keyboard navigation patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="focus-trap">
          <TabsList className="mb-4">
            <TabsTrigger value="focus-trap">Focus Trap</TabsTrigger>
            <TabsTrigger value="dialog-trap">Modal Dialog</TabsTrigger>
            <TabsTrigger value="roving-tabindex">Roving Tabindex</TabsTrigger>
          </TabsList>
          
          {/* Focus Trap Demo */}
          <TabsContent value="focus-trap">
            <div className="space-y-4">
              <p>
                This demo shows how focus can be trapped within a container, preventing
                it from moving outside. Press Tab to navigate between elements, and
                Escape to exit the focus trap.
              </p>
              
              <div className="flex space-x-4">
                <Button 
                  onClick={() => setTrapActive(true)}
                  disabled={trapActive}
                >
                  Activate Focus Trap
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => focusManager.focusFirstElement(document.body)}
                >
                  Focus First Element
                </Button>
              </div>
              
              {trapActive && (
                <div
                  ref={trapContainerRef}
                  className="p-4 border-2 border-primary rounded-lg space-y-4"
                  tabIndex={-1}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Focus Trapped Area</h3>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setTrapActive(false)}
                    >
                      Close
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Label htmlFor="trap-input">Input Field</Label>
                      <Input id="trap-input" placeholder="Type here..." />
                    </div>
                    
                    <RadioGroup defaultValue="option-one">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-one" id="option-one" />
                        <Label htmlFor="option-one">Option One</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="option-two" id="option-two" />
                        <Label htmlFor="option-two">Option Two</Label>
                      </div>
                    </RadioGroup>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" />
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none"
                      >
                        Accept terms and conditions
                      </label>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Submit</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Dialog Focus Trap Demo */}
          <TabsContent value="dialog-trap">
            <div className="space-y-4">
              <p>
                This demo shows a modal dialog with built-in focus management. Focus is
                automatically trapped within the dialog and restored when closed.
              </p>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Modal with Focus Trap</DialogTitle>
                    <DialogDescription>
                      Focus is automatically trapped within this dialog. Try tabbing through
                      the elements and notice how focus remains within the dialog.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Enter your name" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="Enter your email" />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="marketing" />
                      <label
                        htmlFor="marketing"
                        className="text-sm font-medium leading-none"
                      >
                        Receive marketing emails
                      </label>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setDialogOpen(false)}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
          
          {/* Roving Tabindex Demo */}
          <TabsContent value="roving-tabindex">
            <div className="space-y-4">
              <p>
                This demo shows a list with roving tabindex pattern for keyboard navigation.
                Use arrow keys to navigate between items, and Enter to select an item.
              </p>
              
              <ScrollArea className="h-64 border rounded-md p-4">
                <ul
                  ref={listContainerRef}
                  className="space-y-2"
                  role="listbox"
                  aria-label="Options list"
                >
                  {Array.from({ length: 10 }).map((_, index) => (
                    <li
                      key={index}
                      role="option"
                      tabIndex={index === 0 ? 0 : -1}
                      className="p-3 rounded-md hover:bg-muted focus:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-selected={false}
                      onClick={() => {
                        // Handle click
                        if (rovingHandler) {
                          rovingHandler.focusItem(index);
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle Enter key
                        if (e.key === 'Enter') {
                          // Handle selection
                          alert(`Selected item ${index + 1}`);
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <div className="flex-1">
                          <h4 className="font-medium">Item {index + 1}</h4>
                          <p className="text-sm text-muted-foreground">
                            Description for item {index + 1}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              
              <div className="bg-muted/30 p-4 rounded-md">
                <h4 className="font-medium mb-2">Keyboard Navigation</h4>
                <ul className="text-sm space-y-1">
                  <li><kbd className="px-1 rounded border">↑</kbd> / <kbd className="px-1 rounded border">↓</kbd> - Navigate between items</li>
                  <li><kbd className="px-1 rounded border">Home</kbd> - Go to first item</li>
                  <li><kbd className="px-1 rounded border">End</kbd> - Go to last item</li>
                  <li><kbd className="px-1 rounded border">Enter</kbd> - Select current item</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FocusTrapDemo;
