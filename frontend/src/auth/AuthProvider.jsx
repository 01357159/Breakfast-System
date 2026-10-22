import { useEffect, useState } from 'react';
import { supabase, rpc } from '../lib/supabase';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, isOwner: false, loading: !!supabase, error: '' });
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let version = 0;
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const callbackError = params.get('error_description') || hash.get('error_description');
    async function update(session) {
      const current = ++version;
      try {
        const isOwner = session ? await rpc('is_owner') : false;
        if (alive && version === current) setState({ user: session?.user || null, isOwner, loading: false, error: '' });
      } catch (error) {
        if (alive && version === current) setState({ user: session?.user || null, isOwner: false, loading: false, error: error.message });
      }
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error || callbackError) {
        setState({ user: null, isOwner: false, loading: false, error: error?.message || callbackError });
      } else update(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || (callbackError && !session)) return;
      // Run RPC outside the auth callback to avoid holding the SDK's session lock.
      setTimeout(() => { if (alive) update(session); }, 0);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  async function signIn() {
    if (!supabase) throw new Error('Google 登入尚未設定。');
    const redirect = new URL(window.location.href);
    ['code','error','error_code','error_description'].forEach(key => redirect.searchParams.delete(key));
    redirect.hash = '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: redirect.toString() },
    });
    if (error) throw error;
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
  return <AuthContext.Provider value={{ ...state, configured: !!supabase, signIn, signOut }}>{children}</AuthContext.Provider>;
}
