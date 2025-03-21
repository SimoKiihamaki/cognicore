/**
 * Keyboard Shortcut List Component
 * 
 * Displays a list of available keyboard shortcuts with their descriptions.
 * Supports filtering by scope and searching by description or keys.
 */

import React, { useState, useEffect } from 'react';
import keyboardManager, { KeyboardShortcut } from '@/utils/accessibility/KeyboardManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

// Component props
interface KeyboardShortcutListProps {
  className?: string;
  height?: string | number;
  includeDisabled?: boolean;
}

/**
 * Component that displays a list of keyboard shortcuts
 */
const KeyboardShortcutList: React.FC<KeyboardShortcutListProps> = ({
  className = '',
  height = '400px',
  includeDisabled = false
}) => {
  // State for shortcuts, scope, and search
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [activeScope, setActiveScope] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Get shortcuts on mount and when dependencies change
  useEffect(() => {
    // Get all shortcuts
    const allShortcuts = keyboardManager.getShortcuts();
    
    // Filter out disabled shortcuts if needed
    const filteredShortcuts = includeDisabled
      ? allShortcuts
      : allShortcuts.filter(shortcut => !shortcut.disabled);
    
    // Get unique scopes
    const uniqueScopes = ['global', ...new Set(
      filteredShortcuts
        .filter(shortcut => shortcut.scope && shortcut.scope !== 'global')
        .map(shortcut => shortcut.scope!)
    )];
    
    setShortcuts(filteredShortcuts);
    setScopes(uniqueScopes);
  }, [includeDisabled]);
  
  // Filter shortcuts by scope and search query
  const filteredShortcuts = shortcuts.filter(shortcut => {
    // Filter by scope
    if (activeScope !== 'all' && shortcut.scope !== activeScope) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const description = shortcut.description.toLowerCase();
      const keys = keyboardManager.getKeyCombinationString(shortcut).toLowerCase();
      
      return description.includes(query) || keys.includes(query);
    }
    
    return true;
  });
  
  // Group shortcuts by scope for display
  const groupedShortcuts: Record<string, KeyboardShortcut[]> = {};
  
  filteredShortcuts.forEach(shortcut => {
    const scope = shortcut.scope || 'global';
    if (!groupedShortcuts[scope]) {
      groupedShortcuts[scope] = [];
    }
    groupedShortcuts[scope].push(shortcut);
  });
  
  // Format scope name for display
  const formatScopeName = (scope: string): string => {
    return scope.charAt(0).toUpperCase() + scope.slice(1);
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Keyboard Shortcuts</CardTitle>
        <CardDescription>
          Available keyboard shortcuts and commands
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Scope tabs */}
          <Tabs value={activeScope} onValueChange={setActiveScope}>
            <TabsList className="w-full flex">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              {scopes.map(scope => (
                <TabsTrigger key={scope} value={scope} className="flex-1">
                  {formatScopeName(scope)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {/* Shortcuts list */}
          <ScrollArea className="h-[350px] pr-4" style={{ height }}>
            {Object.entries(groupedShortcuts).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([scope, scopeShortcuts]) => (
                  <div key={scope}>
                    {/* Only show scope heading if showing all scopes */}
                    {activeScope === 'all' && (
                      <h3 className="text-sm font-medium mb-2">
                        {formatScopeName(scope)}
                      </h3>
                    )}
                    
                    <div className="space-y-2">
                      {scopeShortcuts.map(shortcut => (
                        <div
                          key={shortcut.id}
                          className={`flex justify-between items-center p-2 rounded-md ${
                            shortcut.disabled
                              ? 'bg-muted/50 text-muted-foreground'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{shortcut.description}</p>
                            {shortcut.disabled && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div>
                            <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow">
                              {keyboardManager.getKeyCombinationString(shortcut)}
                            </kbd>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {searchQuery
                  ? 'No shortcuts match your search'
                  : 'No shortcuts available for this scope'}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeyboardShortcutList;
