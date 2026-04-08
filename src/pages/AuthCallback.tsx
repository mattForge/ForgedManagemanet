import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * AuthCallback handles the redirect from Microsoft SSO.
 * It works for both direct redirects and popup-based flows.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase automatically parses the URL fragment/query for tokens
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        // If this window was opened as a popup, notify the parent and close
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          window.close();
        } else {
          // If it's a direct redirect (fallback), go to workspace
          navigate('/workspace');
        }
      } else if (error) {
        console.error('Auth callback error:', error);
        // If in popup, notify failure and close
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: error.message }, '*');
          window.close();
        } else {
          navigate('/login');
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <div className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">
          &gt; ESTABLISHING ENTERPRISE HANDSHAKE...
        </div>
      </div>
    </div>
  );
}
