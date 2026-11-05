import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import AuthControls from '../auth/AuthControls';
import { rpc } from '../lib/supabase';
import { claimReceiptOrders } from '../data/orderService';
import ReviewForm from './ReviewForm';
import { getReviewComposerState } from './reviewComposerState';
import './Reviews.css';

function ReplyForm({ review, onSaved, onCancel }) {
  const [body, setBody] = useState(review.reply?.body || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) { setError('請輸入回覆內容。'); return; }
    setBusy(true); setError('');
    try {
      await rpc('reply_review', { p_id: review.id, p_body: body.trim() });
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form className="review-form" onSubmit={submit}>
    <label>店家回覆<textarea autoFocus rows={3} maxLength={1000} required disabled={busy} value={body} onChange={e => setBody(e.target.value)} /></label>
    {error && <p role="alert" className="review-error">{error}</p>}
    <div className="review-actions"><button disabled={busy}>{busy ? '發布中…' : '發布回覆'}</button>
      <button type="button" className="secondary" disabled={busy} onClick={onCancel}>取消</button></div>
  </form>;
}

export default function ReviewBoard({ owner = false }) {
  const auth = useAuth();
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(auth.configured);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(null);
  const [replying, setReplying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const customer = !!auth.user && !auth.isOwner && !auth.error;

  useEffect(() => {
    if (!auth.configured || auth.loading) return;
    let alive = true;
    let running = false;
    async function load(claim = false) {
      if (running) return;
      running = true;
      try {
        if (claim && customer) {
          const warnings = await claimReceiptOrders();
          if (alive && warnings.length) setNotice('部分訂單無法認領：' + warnings[0]);
        }
        const [list, eligible] = await Promise.all([
          rpc('list_reviews'), customer ? rpc('my_review_orders') : Promise.resolve([]),
        ]);
        if (alive) { setReviews(list); setOrders(eligible); setError(''); }
      } catch (err) { if (alive) setError(err.message); }
      finally { running = false; if (alive) setLoading(false); }
    }
    load(true);
    const timer = setInterval(() => { if (!document.hidden) load(); }, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [auth.configured, auth.loading, customer, revision]);

  const refresh = () => setRevision(value => value + 1);
  async function save(orderId, form) {
    await rpc('save_review', { p_order_id: orderId, p_rating: form.rating, p_body: form.body, p_name: form.name });
    setEditing(null); setSelectedOrder(''); setComposerOpen(false); setNotice('評論已儲存，謝謝您的分享！'); refresh();
  }
  async function remove() {
    setBusy(true);
    try {
      await rpc('delete_review', { p_id: deleting });
      setDeleting(null); setNotice('您的評論已刪除。'); refresh();
    } catch (err) { setNotice(err.message); }
    finally { setBusy(false); }
  }
  const average = reviews.length ? (reviews.reduce((sum,r) => sum + r.rating,0) / reviews.length).toFixed(1) : '—';
  const composer = getReviewComposerState({
    user: auth.user,
    isOwner: auth.isOwner,
    authError: auth.error,
    orders,
  });
  const available = composer.available;
  const ownOrders = new Map(orders.filter(o => o.review_id).map(o => [o.review_id,o]));

  function startReview() {
    if (!composer.canWrite) {
      setNotice(composer.message);
      return;
    }
    setNotice('');
    setSelectedOrder(composer.defaultOrderId);
    setComposerOpen(true);
  }

  function closeComposer() {
    setSelectedOrder('');
    setComposerOpen(false);
  }

  return <section className="review-board" aria-label={owner ? '顧客評論管理' : '顧客評價'}>
    <header className="review-heading"><div><span className="review-eyebrow">每一份回饋，都讓早餐更好</span><h2>{owner ? '顧客評論管理' : '大家的早餐時光'}</h2></div>
      <button type="button" className="secondary" disabled={!auth.configured || loading} onClick={refresh}>重新整理</button></header>
    {!auth.configured ? <div className="review-empty"><h3>評論服務準備中</h3><p>目前仍可直接點餐。Google 登入與已完成訂單評論將在服務設定完成後開放。</p></div> : <>
      {!owner && <AuthControls />}
      {owner && <p className="review-hint">您可以回覆顧客，評論內容與星等由顧客自行管理。</p>}
      {auth.isOwner && !owner && <p className="review-hint">店家帳號可至後台回覆評論。</p>}
      {loading && <p role="status">正在載入評論…</p>}
      {error && <p role="alert" className="review-error">載入失敗：{error}。請重試。</p>}
      {notice && <p role="status" className="review-notice">{notice}</p>}
      {!loading && <>
        <div className="review-summary"><div><strong>{average}</strong><span> / 5</span><p>{reviews.length} 則已驗證用餐評論</p></div>
          <div className="review-distribution">{[5,4,3,2,1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            return <div key={star}><span>{star} ★</span><meter aria-label={`${star} 星 ${count} 則`} min="0" max={Math.max(1,reviews.length)} value={count} /><span>{count}</span></div>;
          })}</div></div>
        {!owner && <section className="review-compose">
          <div className="review-compose-heading">
            <div><h3>留下您的評價</h3><p>{auth.user ? composer.message : '點餐不需登入。餐點完成後，再使用 Google 登入分享心得。'}</p></div>
            {auth.user && <button type="button" className="review-write-button" onClick={startReview}>★ 撰寫評論</button>}
          </div>
          {auth.user && !customer && <p className="review-hint">{composer.message}</p>}
          {customer && <>
            <p className="review-hint">每筆已完成訂單可留下一則評論。認領前請保留點餐時使用的瀏覽器資料。</p>
            {composerOpen && available.length > 1 && <label>選擇已完成訂單<select value={selectedOrder} disabled={!!editing} onChange={e => setSelectedOrder(e.target.value)}>
              <option value="">請選擇一筆訂單</option>
              {available.map(o => <option value={o.orderId} key={o.orderId}>{o.createdDate} · {o.orderId.slice(-8)}</option>)}
            </select></label>}
            {composerOpen && selectedOrder && !editing && <ReviewForm key={selectedOrder} onSave={form => save(selectedOrder,form)} onCancel={closeComposer} />}
          </>}
        </section>}
        {!reviews.length && !error && <div className="review-empty"><span aria-hidden="true">☀</span><h3>第一則早餐故事，等您分享</h3><p>完成用餐後，留下星等與心得吧。</p></div>}
        <div className="review-list">{reviews.map(review => <article className="review-card" key={review.id}>
          <header><div className="review-avatar" aria-hidden="true">{review.display_name.slice(0,1)}</div><div><strong>{review.display_name}</strong><p><span className="review-verified">✓ 已驗證用餐</span> · <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('zh-TW')}</time></p></div></header>
          <p className="review-stars" aria-label={`${review.rating} 顆星，滿分 5 顆星`}>{'★'.repeat(review.rating)}<span>{'☆'.repeat(5-review.rating)}</span></p>
          {editing === review.id ? <ReviewForm initial={review} onSave={form => save(ownOrders.get(review.id).orderId,form)} onCancel={() => setEditing(null)} /> : <p className="review-body">{review.body}</p>}
          {review.updated_at !== review.created_at && <small className="review-hint">已編輯</small>}
          {!owner && customer && ownOrders.has(review.id) && editing !== review.id && <div className="review-actions">
            <button className="secondary" type="button" disabled={!!editing || !!selectedOrder} onClick={() => setEditing(review.id)}>編輯</button>
            <button className="danger" type="button" onClick={() => setDeleting(review.id)}>刪除</button>
          </div>}
          {deleting === review.id && <div className="review-delete" role="alert"><p>確定刪除這則評論？星等與店家回覆也會一併移除。</p><div className="review-actions">
            <button className="danger" type="button" disabled={busy} onClick={remove}>{busy ? '刪除中…' : '確定刪除'}</button>
            <button className="secondary" type="button" disabled={busy} onClick={() => setDeleting(null)}>取消</button>
          </div></div>}
          {review.reply && <aside className="review-reply"><strong>店家回覆</strong><p className="review-body">{review.reply.body}</p><small>{new Date(review.reply.updated_at).toLocaleDateString('zh-TW')}</small></aside>}
          {owner && auth.isOwner && (replying === review.id ? <ReplyForm review={review} onCancel={() => setReplying(null)} onSaved={() => { setReplying(null); setNotice('店家回覆已發布。'); refresh(); }} /> : <div className="review-actions"><button type="button" onClick={() => setReplying(review.id)}>{review.reply ? '編輯店家回覆' : '回覆顧客'}</button></div>)}
        </article>)}</div>
      </>}
    </>}
  </section>;
}
