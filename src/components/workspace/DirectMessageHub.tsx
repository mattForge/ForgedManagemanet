import { useState, useEffect, useRef, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';
import { Search, Send, User, Circle, Terminal } from 'lucide-react';

interface Colleague {
  id: string;
  full_name: string;
  role: string;
  work_status: string;
}

interface DirectMessage {
  id: string;
  organization_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  isOptimistic?: boolean;
}

export default function DirectMessageHub() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChats, setActiveChats] = useState<Colleague[]>([]);
  const [searchResults, setSearchResults] = useState<Colleague[]>([]);
  const [selectedUser, setSelectedUser] = useState<Colleague | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!searchQuery) {
        fetchActiveChats();
      } else {
        // Debounce search
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
          searchDirectory();
        }, 300);
      }
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, currentUser]);

  useEffect(() => {
    if (selectedUser && currentUser) {
      fetchMessages();
      const subscription = setupRealtime();
      return () => {
        subscription.then(unsub => unsub && supabase.removeChannel(unsub));
      };
    }
  }, [selectedUser, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: user } = await supabase
      .from('forge_users')
      .select('id, organization_id, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  };

  const fetchActiveChats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/directory/active-chats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveChats(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching active chats:', err);
    }
  };

  const searchDirectory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/directory/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Error searching directory:', err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser || !currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('organization_id', currentUser.organization_id)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching DMs:', err);
    }
  };

  const setupRealtime = async () => {
    if (!selectedUser || !currentUser) return null;

    const channel = supabase
      .channel(`dm_${currentUser.id}_${selectedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `organization_id=eq.${currentUser.organization_id}`
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          // Only add if it belongs to this specific 1-on-1 thread
          const isRelevant = 
            (newMsg.sender_id === currentUser.id && newMsg.receiver_id === selectedUser.id) ||
            (newMsg.sender_id === selectedUser.id && newMsg.receiver_id === currentUser.id);
            
          if (isRelevant) {
            setMessages(prev => {
              // Prevent duplicates if we already added it optimistically or via insert response
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // If it's a new conversation, refresh active chats
            if (activeChats.length === 0 || !activeChats.find(u => u.id === (newMsg.sender_id === currentUser.id ? newMsg.receiver_id : newMsg.sender_id))) {
               fetchActiveChats();
            }
          }
        }
      )
      .subscribe();

    return channel;
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (!messageText || !currentUser || !selectedUser) return;

    const sanitizedMessage = DOMPurify.sanitize(messageText);
    if (!sanitizedMessage) return;

    // 1. Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      organization_id: currentUser.organization_id,
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      message: sanitizedMessage,
      is_read: false,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setSendError(null);

    try {
      // 2. Post-Flight Sync
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          organization_id: currentUser.organization_id,
          sender_id: currentUser.id,
          receiver_id: selectedUser.id,
          message: sanitizedMessage
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with the real one from server
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));

      // Refresh active chats if this was the first message
      if (!activeChats.find(u => u.id === selectedUser.id)) {
        fetchActiveChats();
      }
    } catch (err) {
      console.error('Error sending DM:', err);
      setSendError('TRANSMISSION_FAILED: Connection unstable.');
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      
      // Clear error after 3 seconds
      setTimeout(() => setSendError(null), 3000);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'HR') return 'bg-purple-50 text-purple-700 border-purple-100';
    if (role === 'IT_Tech') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (role === 'Admin' || role === 'Super_User') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-gray-50 text-gray-700 border-gray-100';
  };

  const displayedColleagues = searchQuery ? searchResults : activeChats;

  return (
    <div className="flex h-[600px] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Left Pane: Directory */}
      <div className="w-1/3 border-r border-gray-200 bg-slate-50/50 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> {searchQuery ? 'Directory Search' : 'Active Chats'}
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search colleagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayedColleagues.map(colleague => (
            <button
              key={colleague.id}
              onClick={() => setSelectedUser(colleague)}
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${
                selectedUser?.id === colleague.id 
                  ? 'bg-blue-50 border border-blue-100' 
                  : 'hover:bg-white border border-transparent'
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <Circle className={`w-3 h-3 absolute bottom-0 right-0 fill-current border-2 border-white rounded-full ${colleague.work_status === 'Online' ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-semibold text-gray-900 truncate">{colleague.full_name}</div>
                <div className={`text-[10px] font-medium uppercase tracking-wider border px-1.5 py-0.5 rounded-md inline-block mt-1 ${getRoleBadgeColor(colleague.role)}`}>
                  {colleague.role.replace('_', ' ')}
                </div>
              </div>
            </button>
          ))}
          {displayedColleagues.length === 0 && !loading && (
            <div className="text-center p-8 text-sm text-gray-500">
              {searchQuery ? (
                <>No records found for "{searchQuery}"</>
              ) : (
                <>No active conversations.<br />Search colleagues to start chatting.</>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: DM Thread */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedUser.full_name}
                  </h3>
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    {selectedUser.work_status}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm space-y-2">
                  <Send className="w-8 h-8 opacity-20" />
                  <p>Start a conversation with {selectedUser.full_name}</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const safeMessage = DOMPurify.sanitize(msg.message);
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${msg.isOptimistic ? 'opacity-60' : ''}`}>
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
                        {msg.isOptimistic ? 'Sending...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              {sendError && (
                <div className="text-xs text-red-600 mb-2 px-1">
                  {sendError}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <p>Select a colleague to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
