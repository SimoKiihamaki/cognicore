/**
 * Custom hook for using IndexedDB
 * Provides a wrapper around the database service with React state management
 */

import { useState, useEffect, useCallback } from 'react';
import databaseService, { StoreNames, StoreModelMap } from '@/services/database/databaseService';

export function useIndexedDB<T extends StoreNames>(
  storeName: T,
  initialQuery?: () => Promise<StoreModelMap[T][]>
) {
  const [data, setData] = useState<StoreModelMap[T][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch data from the database
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = initialQuery 
        ? await initialQuery() 
        : await databaseService.getAll(storeName);
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error(`Error fetching data from ${storeName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [storeName, initialQuery]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add an item to the database
  const addItem = useCallback(async (item: StoreModelMap[T]): Promise<string | null> => {
    try {
      const id = await databaseService.add(storeName, item);
      await fetchData(); // Refresh data
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error(`Error adding item to ${storeName}:`, err);
      return null;
    }
  }, [storeName, fetchData]);

  // Update an item in the database
  const updateItem = useCallback(async (id: string, updates: Partial<StoreModelMap[T]>): Promise<boolean> => {
    try {
      const success = await databaseService.update(storeName, id, updates);
      
      if (success) {
        setData(prevData => 
          prevData.map(item => 
            (item as any).id === id 
              ? { ...item, ...updates } 
              : item
          )
        );
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error(`Error updating item in ${storeName}:`, err);
      return false;
    }
  }, [storeName]);

  // Delete an item from the database
  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await databaseService.delete(storeName, id);
      
      if (success) {
        setData(prevData => 
          prevData.filter(item => (item as any).id !== id)
        );
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error(`Error deleting item from ${storeName}:`, err);
      return false;
    }
  }, [storeName]);

  // Get an item by ID
  const getItemById = useCallback(async (id: string): Promise<StoreModelMap[T] | null> => {
    try {
      return await databaseService.get(storeName, id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error(`Error getting item from ${storeName}:`, err);
      return null;
    }
  }, [storeName]);

  // Query items by index
  const queryByIndex = useCallback(async (indexName: string, value: any): Promise<StoreModelMap[T][]> => {
    try {
      return await databaseService.queryByIndex(storeName, indexName, value);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error(`Error querying items by index in ${storeName}:`, err);
      return [];
    }
  }, [storeName]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    addItem,
    updateItem,
    deleteItem,
    getItemById,
    queryByIndex
  };
}
