import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';
import { Send, Terminal } from 'lucide-react';

interface Message {
  id: string;
  organization_id: string;
  team_id: string | null;
  sender_id: string;
  message: string;
  created_at: string;
  forge_users?: {
    full_name: string;
  };
}

export default function TeamChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserAndMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserAndMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: user } = await supabase
        .from('forge_users')
        .select('id, organization_id, team_id, full_name')
        .eq('id', session.user.id)
        .single();

      if (user) {
        setCurrentUser(user);
        
        // Fetch existing messages
        const { data: existingMessages, error } = await supabase
          .from('workspace_messages')
          .select('*, forge_users(full_name)')
          .eq('organization_id', user.organization_id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && existingMessages) {
          setMessages(existingMessages);
        }

        // Subscribe to real-time changes
        const channel = supabase
          .channel('public:workspace_messages')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'workspace_messages',
              filter: `organization_id=eq.${user.organization_id}`
            },
            async (payload) => {
              const newMsg = payload.new as Message;
              
              // Fetch sender details for the new message
              const { data: senderData } = await supabase
                .from('forge_users')
                .select('full_name')
                .eq('id', newMsg.sender_id)
                .single();

              const messageWithSender = {
                ...newMsg,
                forge_users: senderData || { full_name: 'Unknown User' }
              };

              setMessages(prev => [...prev, messageWithSender]);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    } catch (err) {
      console.error('Error fetching chat data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    // Sanitize the message using DOMPurify to prevent Stored XSS
    const sanitizedMessage = DOMPurify.sanitize(newMessage.trim());

    if (!sanitizedMessage) return;

    try {
      const { error } = await supabase
        .from('workspace_messages')
        .insert({
          organization_id: currentUser.organization_id,
          team_id: currentUser.team_id || null,
          sender_id: currentUser.id,
          message: sanitizedMessage
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[600px] overflow-hidden relative">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Team Workspace Chat
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] text-green-600 font-bold tracking-wider uppercase">Live Connection</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm animate-pulse">
            Connecting to workspace...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm space-y-2">
            <Send className="w-8 h-8 opacity-20" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const safeMessage = DOMPurify.sanitize(msg.message);
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase tracking-wider">
                  {isMe ? 'You' : msg.forge_users?.full_name}
                </span>
                <div 
                  className={`
                    max-w-[80%] p-3 rounded-2xl text-sm shadow-sm
                    ${isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
                    }
                  `}
                  dangerouslySetInnerHTML={{ __html: safeMessage }}
                />
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message to the team..."
            className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
