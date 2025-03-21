/**
 * Virtualized Data Hook
 * 
 * Custom hook for efficiently handling large datasets by only loading
 * and rendering visible items. Supports pagination, infinite scrolling,
 * and virtualized rendering.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type VirtualizationOptions<T> = {
  data: T[];
  itemHeight: number;
  overscan?: number;
  loadMoreThreshold?: number;
  loadMoreItems?: () => Promise<void>;
  isLoading?: boolean;
  hasMoreItems?: boolean;
  keyExtractor?: (item: T, index: number) => string | number;
};

export type VirtualizedItem<T> = {
  item: T;
  index: number;
  style: {
    height: number;
    position: 'absolute';
    top: number;
    left: 0;
    right: 0;
    visibility: 'visible' | 'hidden';
  };
};

export type VirtualizedData<T> = {
  containerProps: {
    style: {
      height: string;
      position: 'relative';
      width: '100%';
    };
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    ref: React.RefObject<HTMLDivElement>;
  };
  virtualItems: VirtualizedItem<T>[];
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
  isLoadingMore: boolean;
  totalItems: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
};

/**
 * Hook for virtualizing large datasets
 */
const useVirtualizedData = <T>({
  data,
  itemHeight,
  overscan = 3,
  loadMoreThreshold = 200,
  loadMoreItems,
  isLoading = false,
  hasMoreItems = false,
  keyExtractor = (_, index) => index
}: VirtualizationOptions<T>): VirtualizedData<T> => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Calculate visible range
  const visibleStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEndIndex = Math.min(
    data.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  // Update container height on resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    
    updateContainerHeight();
    
    const resizeObserver = new ResizeObserver(updateContainerHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateContainerHeight);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerHeight);
    };
  }, []);
  
  // Handle scrolling and load more
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    setScrollTop(scrollTop);
    
    // Load more if needed
    if (
      !isLoading &&
      !isLoadingMore &&
      hasMoreItems &&
      loadMoreItems &&
      scrollHeight - scrollTop - clientHeight < loadMoreThreshold
    ) {
      setIsLoadingMore(true);
      loadMoreItems().finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [isLoading, isLoadingMore, hasMoreItems, loadMoreItems, loadMoreThreshold]);
  
  // Generate virtualized items
  const virtualItems = data.slice(visibleStartIndex, visibleEndIndex + 1).map((item, index) => {
    const absoluteIndex = visibleStartIndex + index;
    
    return {
      item,
      index: absoluteIndex,
      style: {
        height: itemHeight,
        position: 'absolute' as const,
        top: absoluteIndex * itemHeight,
        left: 0,
        right: 0,
        visibility: 'visible' as const
      }
    };
  });
  
  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current) return;
    
    let scrollPosition: number;
    const indexPosition = index * itemHeight;
    
    switch (align) {
      case 'center':
        scrollPosition = indexPosition - containerHeight / 2 + itemHeight / 2;
        break;
      case 'end':
        scrollPosition = indexPosition - containerHeight + itemHeight;
        break;
      case 'start':
      default:
        scrollPosition = indexPosition;
        break;
    }
    
    containerRef.current.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  }, [containerHeight, itemHeight]);
  
  return {
    containerProps: {
      style: {
        height: '100%',
        position: 'relative',
        width: '100%'
      },
      onScroll: handleScroll,
      ref: containerRef
    },
    virtualItems,
    scrollToIndex,
    isLoadingMore,
    totalItems: data.length,
    visibleStartIndex,
    visibleEndIndex
  };
};

export default useVirtualizedData;
