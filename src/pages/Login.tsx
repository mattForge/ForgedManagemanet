import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Terminal, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Listen for OAuth success message from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setLoading(true);
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) throw sessionError || new Error('No session established');

          // Call the server-side verification bridge to determine routing
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: session.access_token }),
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Verification failed');

          navigate(result.redirectPath);
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'Authentication failed');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile',
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (authError) throw authError;

      if (data.url) {
        // Open the OAuth provider's URL directly in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.url,
          'microsoft_sso_popup',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (err: any) {
      setError(err.message);
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
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Enterprise SSO Portal</p>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-2">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-100">Centralized Access Control</h2>
              <p className="text-sm text-zinc-500">Please authenticate using your Microsoft 365 credentials to initialize your session.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm font-mono">
                &gt; ERR: {error}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-3.5 px-4 rounded border border-zinc-200 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#f35325" d="M0 0h11v11H0z"/>
                      <path fill="#81bc06" d="M12 0h11v11H12z"/>
                      <path fill="#05a6f0" d="M0 12h11v11H0z"/>
                      <path fill="#ffba08" d="M12 12h11v11H12z"/>
                    </svg>
                    <span>Sign in with Microsoft 365</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-zinc-800"></div>
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Secure Entra ID Link</span>
              <div className="flex-1 h-px bg-zinc-800"></div>
            </div>

            <p className="text-[10px] text-center text-zinc-600 font-mono leading-relaxed">
              &gt; SYSTEM_NOTE: Unauthorized access attempts are logged and reported to the security operations center.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
