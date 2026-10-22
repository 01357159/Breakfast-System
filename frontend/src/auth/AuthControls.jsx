import { useState } from 'react';
import { useAuth } from './authContext';

export default function AuthControls({ owner = false }) {
  const auth = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function act() {
    setError(''); setBusy(true);
    try { await (auth.user ? auth.signOut() : auth.signIn()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="review-auth">
    {auth.user && <span>已登入：{auth.user.user_metadata?.full_name || auth.user.email}</span>}
    <button type="button" disabled={!auth.configured || auth.loading || busy} onClick={act}>
      {auth.loading ? '確認登入中…' : auth.user ? '登出' : owner ? '使用 Google 登入店家後台' : '使用 Google 登入以撰寫評論'}
    </button>
    {(error || auth.error) && <p role="alert">{error || auth.error}</p>}
  </div>;
}
