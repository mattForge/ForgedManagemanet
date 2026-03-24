import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Toast {
  id: string;
  message: string;
  type: 'message' | 'ticket' | 'error';
}

interface NotificationContextType {
  unreadDMs: number;
  unreadTickets: number;
  activeToasts: Toast[];
  addToast: (message: string, type: 'message' | 'ticket' | 'error') => void;
  removeToast: (id: string) => void;
  clearUnreadDMs: () => void;
  clearUnreadTickets: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('forge_users')
          .select('role, organization_id')
          .eq('id', user.id)
          .single();
        setUser({ ...user, ...userData });
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          setUnreadDMs((prev) => prev + 1);
          
          // Fetch sender name
          const { data: sender } = await supabase
            .from('forge_users')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();
          
          addToast(`New Message from ${sender?.full_name || 'Personnel'}`, 'message');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_desk_tickets',
          filter: `organization_id=eq.${user.organization_id}`,
        },
        (payload) => {
          const isITTech = ['IT_Tech', 'Admin', 'Super_User'].includes(user.role);
          
          if (payload.eventType === 'INSERT' && isITTech) {
            setUnreadTickets((prev) => prev + 1);
            addToast('New IT Support Ticket Submitted', 'ticket');
          } else if (payload.eventType === 'UPDATE') {
            const oldTicket = payload.old;
            const newTicket = payload.new;
            
            // If standard user and their ticket is resolved
            if (!isITTech && newTicket.created_by === user.id && newTicket.status === 'Resolved' && oldTicket.status !== 'Resolved') {
              addToast('Your ticket has been resolved', 'ticket');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addToast = (message: string, type: 'message' | 'ticket' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setActiveToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearUnreadDMs = () => setUnreadDMs(0);
  const clearUnreadTickets = () => setUnreadTickets(0);

  return (
    <NotificationContext.Provider
      value={{
        unreadDMs,
        unreadTickets,
        activeToasts,
        addToast,
        removeToast,
        clearUnreadDMs,
        clearUnreadTickets,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
