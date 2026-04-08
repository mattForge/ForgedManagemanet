import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Terminal } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Strict Server-Side Auth & Routing Bridge
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: data.session.access_token }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Verification failed');

      navigate(result.redirectPath);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-300 relative overflow-hidden">
      {/* Carbon fiber texture overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
          {/* Header - Brushed Steel */}
          <div className="bg-gradient-to-b from-zinc-700 to-zinc-900 p-6 border-b border-zinc-950 flex items-center gap-3">
            <div className="p-2 bg-zinc-950 rounded shadow-inner border border-zinc-800">
              <Terminal className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-wider uppercase">ForgeManager</h1>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">System Authentication</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-mono">
                &gt; ERR: {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  Operator ID (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 font-mono text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  Access Code (Password)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 font-mono text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-zinc-100 font-bold py-3 px-4 rounded border border-zinc-600 shadow-md active:scale-95 active:shadow-inner transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
            >
              {loading ? (
                <span className="text-cyan-400 font-mono animate-pulse">&gt; Authenticating...</span>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                  Initialize Session
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
