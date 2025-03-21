/**
 * Keyboard Manager
 * 
 * Utility for managing keyboard shortcuts and keyboard navigation.
 * Supports global and scoped shortcuts with priority levels, modifiers,
 * sequence detection, and customizable shortcuts.
 */

export type KeyCombination = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type KeySequence = KeyCombination[];

export type KeyboardShortcut = {
  id: string;
  description: string;
  keys: KeyCombination | KeySequence;
  callback: (event: KeyboardEvent) => void;
  scope?: string;
  priority: number;
  disabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
};

export type ShortcutFilter = {
  scope?: string | string[];
  id?: string | string[];
};

/**
 * Class for managing keyboard shortcuts and navigation
 */
class KeyboardManager {
  private shortcuts: KeyboardShortcut[] = [];
  private activeScopes: string[] = ['global'];
  private keySequenceBuffer: string[] = [];
  private keySequenceTimeout: number | null = null;
  private keySequenceDelay: number = 1000; // ms
  
  constructor() {
    // Bind event listener to document
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Register a keyboard shortcut
   * @param shortcut Keyboard shortcut configuration
   * @returns Shortcut ID
   */
  public registerShortcut(shortcut: Omit<KeyboardShortcut, 'id'>): string {
    // Generate ID if not provided
    const id = shortcut.id || `shortcut-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Set default scope if not provided
    const scope = shortcut.scope || 'global';
    
    // Add to shortcuts
    this.shortcuts.push({
      ...shortcut,
      id,
      scope,
      priority: shortcut.priority || 0
    });
    
    // Sort shortcuts by priority (high to low)
    this.shortcuts.sort((a, b) => b.priority - a.priority);
    
    return id;
  }
  
  /**
   * Unregister a keyboard shortcut
   * @param id Shortcut ID
   */
  public unregisterShortcut(id: string): void {
    this.shortcuts = this.shortcuts.filter(shortcut => shortcut.id !== id);
  }
  
  /**
   * Enable or disable a shortcut
   * @param id Shortcut ID
   * @param disabled Whether the shortcut should be disabled
   */
  public setShortcutDisabled(id: string, disabled: boolean): void {
    const shortcut = this.shortcuts.find(s => s.id === id);
    if (shortcut) {
      shortcut.disabled = disabled;
    }
  }
  
  /**
   * Add an active scope
   * @param scope Scope name
   */
  public addScope(scope: string): void {
    if (!this.activeScopes.includes(scope)) {
      this.activeScopes.push(scope);
    }
  }
  
  /**
   * Remove an active scope
   * @param scope Scope name
   */
  public removeScope(scope: string): void {
    this.activeScopes = this.activeScopes.filter(s => s !== scope);
  }
  
  /**
   * Set active scopes
   * @param scopes Array of scope names
   */
  public setScopes(scopes: string[]): void {
    // Always include global scope
    this.activeScopes = ['global', ...scopes.filter(s => s !== 'global')];
  }
  
  /**
   * Get all registered shortcuts
   * @param filter Optional filter
   */
  public getShortcuts(filter?: ShortcutFilter): KeyboardShortcut[] {
    return this.shortcuts.filter(shortcut => {
      // Filter by scope
      if (filter?.scope) {
        const scopes = Array.isArray(filter.scope) ? filter.scope : [filter.scope];
        if (!scopes.includes(shortcut.scope || 'global')) {
          return false;
        }
      }
      
      // Filter by ID
      if (filter?.id) {
        const ids = Array.isArray(filter.id) ? filter.id : [filter.id];
        if (!ids.includes(shortcut.id)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get the key combination string for a shortcut
   * @param shortcut Shortcut or key combination
   */
  public getKeyCombinationString(
    shortcut: KeyboardShortcut | KeyCombination | KeySequence
  ): string {
    // If it's a shortcut object
    if ('keys' in shortcut) {
      if (Array.isArray(shortcut.keys)) {
        // Sequence
        return shortcut.keys.map(this.formatKeyCombination).join(' then ');
      } else {
        // Single combination
        return this.formatKeyCombination(shortcut.keys);
      }
    }
    // If it's already a key sequence
    else if (Array.isArray(shortcut)) {
      return shortcut.map(this.formatKeyCombination).join(' then ');
    }
    // If it's a single key combination
    else {
      return this.formatKeyCombination(shortcut);
    }
  }
  
  /**
   * Format a key combination as a string
   * @param combo Key combination
   */
  private formatKeyCombination(combo: KeyCombination): string {
    const parts: string[] = [];
    
    if (combo.ctrl) parts.push('Ctrl');
    if (combo.alt) parts.push('Alt');
    if (combo.shift) parts.push('Shift');
    if (combo.meta) parts.push('Meta');
    
    // Format key with proper capitalization
    let key = combo.key;
    if (key.length === 1) {
      key = key.toUpperCase();
    } else if (key.startsWith('Key')) {
      key = key.substring(3).toUpperCase();
    } else if (key.startsWith('Digit')) {
      key = key.substring(5);
    } else if (key.startsWith('Arrow')) {
      key = key.substring(5);
    }
    
    parts.push(key);
    
    return parts.join('+');
  }
  
  /**
   * Handle keydown events
   * @param event Keyboard event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Create key combination from event
    const combo: KeyCombination = {
      key: event.code || event.key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    };
    
    // Add to sequence buffer
    this.addToSequenceBuffer(combo);
    
    // Find matching shortcuts (single key and sequences)
    const matchingShortcuts = this.findMatchingShortcuts(combo);
    
    // Execute matching shortcuts
    for (const shortcut of matchingShortcuts) {
      // Skip if disabled
      if (shortcut.disabled) {
        continue;
      }
      
      // Check if scope is active
      if (shortcut.scope && !this.activeScopes.includes(shortcut.scope)) {
        continue;
      }
      
      // Prevent default if needed
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      
      // Stop propagation if needed
      if (shortcut.stopPropagation) {
        event.stopPropagation();
      }
      
      // Execute callback
      try {
        shortcut.callback(event);
      } catch (error) {
        console.error('Error executing keyboard shortcut:', error);
      }
      
      // Break after first successful shortcut
      break;
    }
  }
  
  /**
   * Add a key combination to the sequence buffer
   * @param combo Key combination
   */
  private addToSequenceBuffer(combo: KeyCombination): void {
    // Add to buffer
    this.keySequenceBuffer.push(this.getKeyCombinationString(combo));
    
    // Reset timeout
    if (this.keySequenceTimeout !== null) {
      clearTimeout(this.keySequenceTimeout);
    }
    
    // Set new timeout
    this.keySequenceTimeout = window.setTimeout(() => {
      this.keySequenceBuffer = [];
      this.keySequenceTimeout = null;
    }, this.keySequenceDelay);
  }
  
  /**
   * Find shortcuts that match the current key or sequence
   * @param combo Current key combination
   */
  private findMatchingShortcuts(combo: KeyCombination): KeyboardShortcut[] {
    const currentSequence = [...this.keySequenceBuffer];
    const currentKey = this.getKeyCombinationString(combo);
    
    return this.shortcuts.filter(shortcut => {
      // Skip disabled shortcuts
      if (shortcut.disabled) {
        return false;
      }
      
      // Check if shortcut scope is active
      if (shortcut.scope && !this.activeScopes.includes(shortcut.scope)) {
        return false;
      }
      
      // Check if it's a key sequence
      if (Array.isArray(shortcut.keys)) {
        const shortcutSequence = shortcut.keys.map(this.formatKeyCombination);
        
        // Check if the current sequence matches the shortcut
        if (currentSequence.length !== shortcutSequence.length) {
          return false;
        }
        
        for (let i = 0; i < shortcutSequence.length; i++) {
          if (currentSequence[i] !== shortcutSequence[i]) {
            return false;
          }
        }
        
        return true;
      }
      // Check if it's a single key
      else {
        const shortcutKey = this.getKeyCombinationString(shortcut.keys);
        return currentKey === shortcutKey;
      }
    });
  }
  
  /**
   * Clean up manager
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.shortcuts = [];
    this.activeScopes = ['global'];
    this.keySequenceBuffer = [];
    
    if (this.keySequenceTimeout !== null) {
      clearTimeout(this.keySequenceTimeout);
      this.keySequenceTimeout = null;
    }
  }
}

// Export a singleton instance
const keyboardManager = new KeyboardManager();
export default keyboardManager;
