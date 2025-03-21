/**
 * Virtualized List Component
 * 
 * Generic component for rendering large lists with efficient virtualization.
 * Only renders items that are visible in the viewport, with configurable
 * overscan to prevent flickering during scrolling.
 */

import React, { ReactNode } from 'react';
import useVirtualizedData, { VirtualizationOptions } from '@/hooks/virtualization/useVirtualizedData';
import { Loader2 } from 'lucide-react';

type VirtualizedListProps<T> = Omit<VirtualizationOptions<T>, 'isLoading'> & {
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  emptyContent?: ReactNode;
  loadingContent?: ReactNode;
  isLoading?: boolean;
  footer?: ReactNode;
  estimatedTotalItems?: number;
};

/**
 * Component for efficiently rendering large lists with virtualization
 */
function VirtualizedList<T>({
  data,
  itemHeight,
  overscan = 3,
  loadMoreThreshold = 200,
  loadMoreItems,
  hasMoreItems = false,
  keyExtractor = (_, index) => index,
  renderItem,
  className = '',
  emptyContent,
  loadingContent,
  isLoading = false,
  footer,
  estimatedTotalItems
}: VirtualizedListProps<T>): JSX.Element {
  const {
    containerProps,
    virtualItems,
    isLoadingMore,
    totalItems
  } = useVirtualizedData<T>({
    data,
    itemHeight,
    overscan,
    loadMoreThreshold,
    loadMoreItems,
    isLoading,
    hasMoreItems,
    keyExtractor
  });
  
  const totalHeight = estimatedTotalItems 
    ? estimatedTotalItems * itemHeight 
    : data.length * itemHeight;
    
  return (
    <div className={`virtualized-list-container ${className}`} {...containerProps}>
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div
            key={keyExtractor(item, index)}
            style={style}
            className="virtualized-item"
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {/* Show loading content */}
      {isLoading && data.length === 0 && (
        <div className="virtualized-list-loading">
          {loadingContent || (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="animate-spin mr-2" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      )}
      
      {/* Show empty content */}
      {!isLoading && data.length === 0 && (
        <div className="virtualized-list-empty">
          {emptyContent || (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              No items to display
            </div>
          )}
        </div>
      )}
      
      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="virtualized-list-loading-more flex items-center justify-center p-2">
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}
      
      {/* Optional footer */}
      {footer && (
        <div className="virtualized-list-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

export default VirtualizedList;
