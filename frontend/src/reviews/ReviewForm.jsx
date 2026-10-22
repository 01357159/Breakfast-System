import { useState } from 'react';

export default function ReviewForm({ initial, onSave, onCancel }) {
  const [rating, setRating] = useState(initial?.rating || 0);
  const [body, setBody] = useState(initial?.body || '');
  const [name, setName] = useState(initial?.display_name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!rating || !body.trim() || !name.trim()) { setError('請選擇星等並填寫顯示名稱與評論。'); return; }
    setBusy(true); setError('');
    try { await onSave({ rating, body: body.trim(), name: name.trim() }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form className="review-form" onSubmit={submit}>
    <h3>{initial?.id ? '編輯我的評論' : '分享這次的用餐體驗'}</h3>
    <fieldset disabled={busy}>
      <legend>整體評分（必填）</legend>
      <div className="review-stars-input">
        {[1,2,3,4,5].map(value => <label key={value}>
          <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required />
          <span className={value <= rating ? 'filled' : ''}>★</span>
          <span className="review-sr-only">{value} 顆星</span>
        </label>)}
      </div>
    </fieldset>
    <label>公開顯示名稱
      <input value={name} onChange={e => setName(e.target.value)} maxLength={60} required disabled={busy} placeholder="怎麼稱呼您？" />
    </label>
    <label>您的評論
      <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} rows={4} required disabled={busy} placeholder="餐點、服務或任何想分享的感受…" />
    </label>
    <small>{body.length} / 1000 字</small>
    {error && <p className="review-error" role="alert">{error}</p>}
    <div className="review-actions">
      <button disabled={busy} type="submit">{busy ? '儲存中…' : initial?.id ? '儲存修改' : '發布評論'}</button>
      <button disabled={busy} className="secondary" type="button" onClick={onCancel}>取消</button>
    </div>
  </form>;
}
