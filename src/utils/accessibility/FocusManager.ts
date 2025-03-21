/**
 * Focus Manager
 * 
 * Utility for managing keyboard focus navigation and accessibility.
 * Provides methods for trapping focus in modals, restoring focus,
 * and implementing keyboard navigation patterns.
 */

type FocusableElement = HTMLElement & {
  focus: () => void;
  disabled?: boolean;
};

type FocusTrapOptions = {
  initialFocus?: HTMLElement;
  fallbackFocus?: HTMLElement | string;
  escapeDeactivates?: boolean;
  returnFocusOnDeactivate?: boolean;
  preventScroll?: boolean;
  clickOutsideDeactivates?: boolean;
  allowOutsideClick?: boolean | ((event: MouseEvent) => boolean);
};

/**
 * Class for managing focus and keyboard navigation
 */
class FocusManager {
  private traps: Map<string, {
    container: HTMLElement;
    previousActiveElement: HTMLElement | null;
    options: FocusTrapOptions;
    active: boolean;
  }> = new Map();
  
  private activeTraps: string[] = [];
  
  /**
   * Get all focusable elements within a container
   */
  public getFocusableElements(container: HTMLElement): FocusableElement[] {
    // Common focusable selectors
    const selector = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
      'select:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]:not([tabindex="-1"])'
    ].join(',');
    
    // Get all focusable elements
    const elements = Array.from(
      container.querySelectorAll<FocusableElement>(selector)
    ).filter(el => {
      // Filter out hidden elements
      return el.offsetParent !== null && !el.disabled;
    });
    
    return elements;
  }
  
  /**
   * Create a focus trap within a container
   * @param container Container element
   * @param options Focus trap options
   * @returns Trap ID
   */
  public createFocusTrap(
    container: HTMLElement,
    options: FocusTrapOptions = {}
  ): string {
    // Generate unique ID
    const trapId = `focus-trap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Default options
    const defaultOptions: FocusTrapOptions = {
      escapeDeactivates: true,
      returnFocusOnDeactivate: true,
      preventScroll: false,
      clickOutsideDeactivates: false,
      allowOutsideClick: false
    };
    
    // Merge options
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Save current active element
    const previousActiveElement = document.activeElement as HTMLElement;
    
    // Store trap
    this.traps.set(trapId, {
      container,
      previousActiveElement,
      options: mergedOptions,
      active: false
    });
    
    return trapId;
  }
  
  /**
   * Activate a focus trap
   * @param trapId Trap ID
   */
  public activateFocusTrap(trapId: string): void {
    const trap = this.traps.get(trapId);
    if (!trap) {
      console.warn(`Focus trap with ID ${trapId} not found`);
      return;
    }
    
    // Set as active
    trap.active = true;
    this.activeTraps.push(trapId);
    
    // Set initial focus
    const focusableElements = this.getFocusableElements(trap.container);
    
    if (focusableElements.length > 0) {
      if (trap.options.initialFocus) {
        trap.options.initialFocus.focus();
      } else if (trap.options.fallbackFocus) {
        if (typeof trap.options.fallbackFocus === 'string') {
          const element = trap.container.querySelector<HTMLElement>(trap.options.fallbackFocus);
          if (element) {
            element.focus();
          } else {
            focusableElements[0].focus();
          }
        } else {
          trap.options.fallbackFocus.focus();
        }
      } else {
        focusableElements[0].focus();
      }
    }
    
    // Set event listeners
    this.setupTrapEvents(trapId);
  }
  
  /**
   * Deactivate a focus trap
   * @param trapId Trap ID
   */
  public deactivateFocusTrap(trapId: string): void {
    const trap = this.traps.get(trapId);
    if (!trap || !trap.active) {
      return;
    }
    
    // Remove from active traps
    const index = this.activeTraps.indexOf(trapId);
    if (index !== -1) {
      this.activeTraps.splice(index, 1);
    }
    
    // Update trap state
    trap.active = false;
    
    // Remove event listeners
    this.removeTrapEvents(trapId);
    
    // Restore focus
    if (trap.options.returnFocusOnDeactivate && trap.previousActiveElement) {
      trap.previousActiveElement.focus({
        preventScroll: !!trap.options.preventScroll
      });
    }
  }
  
  /**
   * Remove a focus trap completely
   * @param trapId Trap ID
   */
  public removeFocusTrap(trapId: string): void {
    // Deactivate if active
    this.deactivateFocusTrap(trapId);
    
    // Remove from traps
    this.traps.delete(trapId);
  }
  
  /**
   * Get the active trap ID
   */
  public getActiveTraps(): string[] {
    return [...this.activeTraps];
  }
  
  /**
   * Focus the first element in a container
   * @param container Container element
   * @param preventScroll Whether to prevent scrolling to the element
   */
  public focusFirstElement(
    container: HTMLElement,
    preventScroll: boolean = false
  ): void {
    const elements = this.getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus({ preventScroll });
    }
  }
  
  /**
   * Focus the last element in a container
   * @param container Container element
   * @param preventScroll Whether to prevent scrolling to the element
   */
  public focusLastElement(
    container: HTMLElement,
    preventScroll: boolean = false
  ): void {
    const elements = this.getFocusableElements(container);
    if (elements.length > 0) {
      elements[elements.length - 1].focus({ preventScroll });
    }
  }
  
  /**
   * Save the current focus
   * @returns Previously focused element
   */
  public saveFocus(): HTMLElement | null {
    return document.activeElement as HTMLElement;
  }
  
  /**
   * Restore focus to a previously focused element
   * @param element Element to focus
   * @param preventScroll Whether to prevent scrolling to the element
   */
  public restoreFocus(
    element: HTMLElement | null,
    preventScroll: boolean = false
  ): void {
    if (element && 'focus' in element) {
      element.focus({ preventScroll });
    }
  }
  
  /**
   * Create a roving tabindex handler for list-like components
   * @param container Container element
   * @param selector Selector for focusable items
   * @returns Object with methods for managing roving tabindex
   */
  public createRovingTabindex(
    container: HTMLElement,
    selector: string
  ): {
    init: () => void;
    handleKeyDown: (event: KeyboardEvent) => void;
    focusItem: (index: number) => void;
  } {
    let currentIndex = 0;
    
    const getItems = () => {
      return Array.from(container.querySelectorAll<HTMLElement>(selector));
    };
    
    const focusItem = (index: number) => {
      const items = getItems();
      if (items.length === 0) return;
      
      // Ensure index is within bounds
      const newIndex = Math.max(0, Math.min(items.length - 1, index));
      
      // Set tabindex attributes
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === newIndex ? '0' : '-1');
      });
      
      // Focus the item
      items[newIndex].focus();
      currentIndex = newIndex;
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;
      
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          focusItem((currentIndex + 1) % items.length);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          focusItem((currentIndex - 1 + items.length) % items.length);
          break;
        case 'Home':
          event.preventDefault();
          focusItem(0);
          break;
        case 'End':
          event.preventDefault();
          focusItem(items.length - 1);
          break;
      }
    };
    
    const init = () => {
      const items = getItems();
      if (items.length === 0) return;
      
      // Set initial tabindex values
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === 0 ? '0' : '-1');
      });
      
      // Add event listener to container
      container.addEventListener('keydown', handleKeyDown);
    };
    
    return {
      init,
      handleKeyDown,
      focusItem
    };
  }
  
  /**
   * Set up event listeners for a focus trap
   * @param trapId Trap ID
   */
  private setupTrapEvents(trapId: string): void {
    const trap = this.traps.get(trapId);
    if (!trap) return;
    
    // Attach event listeners
    document.addEventListener('keydown', this.handleTrapKeyDown.bind(this, trapId));
    document.addEventListener('focusin', this.handleTrapFocus.bind(this, trapId));
    
    if (trap.options.clickOutsideDeactivates || trap.options.allowOutsideClick) {
      document.addEventListener('click', this.handleTrapClick.bind(this, trapId));
      document.addEventListener('mousedown', this.handleTrapMouseDown.bind(this, trapId));
    }
  }
  
  /**
   * Remove event listeners for a focus trap
   * @param trapId Trap ID
   */
  private removeTrapEvents(trapId: string): void {
    document.removeEventListener('keydown', this.handleTrapKeyDown.bind(this, trapId));
    document.removeEventListener('focusin', this.handleTrapFocus.bind(this, trapId));
    document.removeEventListener('click', this.handleTrapClick.bind(this, trapId));
    document.removeEventListener('mousedown', this.handleTrapMouseDown.bind(this, trapId));
  }
  
  /**
   * Handle keydown events for a focus trap
   * @param trapId Trap ID
   * @param event Keyboard event
   */
  private handleTrapKeyDown(trapId: string, event: KeyboardEvent): void {
    const trap = this.traps.get(trapId);
    if (!trap || !trap.active) return;
    
    // Handle Escape key
    if (
      event.key === 'Escape' &&
      trap.options.escapeDeactivates &&
      this.activeTraps[this.activeTraps.length - 1] === trapId
    ) {
      event.preventDefault();
      this.deactivateFocusTrap(trapId);
      return;
    }
    
    // Handle Tab key
    if (event.key === 'Tab') {
      // Only process if this is the top-most trap
      if (this.activeTraps[this.activeTraps.length - 1] !== trapId) {
        return;
      }
      
      const focusableElements = this.getFocusableElements(trap.container);
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Shift+Tab from first element should focus last element
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab from last element should focus first element
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  /**
   * Handle focus events for a focus trap
   * @param trapId Trap ID
   * @param event Focus event
   */
  private handleTrapFocus(trapId: string, event: FocusEvent): void {
    const trap = this.traps.get(trapId);
    if (!trap || !trap.active) return;
    
    // Only process if this is the top-most trap
    if (this.activeTraps[this.activeTraps.length - 1] !== trapId) {
      return;
    }
    
    const target = event.target as HTMLElement;
    
    // If focus moves outside the trap, move it back
    if (!trap.container.contains(target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      
      // Focus the first focusable element
      const focusableElements = this.getFocusableElements(trap.container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }
  
  /**
   * Handle click events for a focus trap
   * @param trapId Trap ID
   * @param event Mouse event
   */
  private handleTrapClick(trapId: string, event: MouseEvent): void {
    const trap = this.traps.get(trapId);
    if (!trap || !trap.active) return;
    
    const target = event.target as HTMLElement;
    
    // If click is outside the trap
    if (!trap.container.contains(target)) {
      // Deactivate if clickOutsideDeactivates is true
      if (trap.options.clickOutsideDeactivates) {
        this.deactivateFocusTrap(trapId);
      }
      
      // Check if outside clicks are allowed
      if (typeof trap.options.allowOutsideClick === 'function') {
        if (!trap.options.allowOutsideClick(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else if (!trap.options.allowOutsideClick) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }
  
  /**
   * Handle mousedown events for a focus trap
   * @param trapId Trap ID
   * @param event Mouse event
   */
  private handleTrapMouseDown(trapId: string, event: MouseEvent): void {
    const trap = this.traps.get(trapId);
    if (!trap || !trap.active) return;
    
    const target = event.target as HTMLElement;
    
    // If mousedown is outside the trap and outside clicks are not allowed
    if (
      !trap.container.contains(target) &&
      !trap.options.clickOutsideDeactivates &&
      !trap.options.allowOutsideClick
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

// Export a singleton instance
const focusManager = new FocusManager();
export default focusManager;
