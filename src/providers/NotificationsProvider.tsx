import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionRoute?: string; // Optional route to navigate to when clicked
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => '',
  removeNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {}
});

export const useNotifications = () => useContext(NotificationsContext);

interface NotificationsProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children,
  maxNotifications = 50
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const storedNotifications = localStorage.getItem('cognicore-notifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }, []);
  
  // Update unread count whenever notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
    
    // Save to localStorage when notifications change
    localStorage.setItem('cognicore-notifications', JSON.stringify(notifications));
  }, [notifications]);
  
  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = uuidv4();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => {
      // Add to beginning of array and limit to maxNotifications
      const updated = [newNotification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    
    return id;
  };
  
  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    );
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };
  
  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
  };
  
  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export default NotificationsProvider;