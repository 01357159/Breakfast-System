export const receiptKey = 'breakfast_guest_receipts_v1';
const pendingKey = 'breakfast_pending_checkout_v1';

function fingerprint(order) {
  return JSON.stringify([order.seat, order.pickupTime, order.items]);
}

// Dependencies are explicit so receipt persistence and uncertain network failures
// can be exercised without a browser or a live Supabase project.
export async function submitGuestOrder({ order, storage, call, randomId, randomToken }) {
  let pending = JSON.parse(storage.getItem(pendingKey) || 'null');
  const recoveredPrevious = !!pending && fingerprint(pending.order) !== fingerprint(order);
  if (!pending) {
    pending = { order: { ...order, orderId: randomId() }, receipt: randomToken() };
    const receipts = JSON.parse(storage.getItem(receiptKey) || '[]');
    if (!Array.isArray(receipts)) throw new Error('訂單收據無法讀取，請聯絡店家。');
    storage.setItem(receiptKey, JSON.stringify([...receipts, { id: pending.order.orderId, receipt: pending.receipt }]));
    storage.setItem(pendingKey, JSON.stringify(pending));
  }
  let data;
  try {
    data = await call('submit_guest_order', {
      p_id: pending.order.orderId, p_receipt: pending.receipt,
      p_seat: pending.order.seat, p_pickup: pending.order.pickupTime, p_items: pending.order.items,
    });
  } catch (error) {
    // These database errors definitively roll back the call. Network/API errors
    // remain uncertain: keep the same receipt so retry cannot create a duplicate.
    if (['P0001','23514','23502','22003','22P02'].includes(error.code)) {
      storage.removeItem(pendingKey);
    }
    throw error;
  }
  storage.removeItem(pendingKey);
  return { ...data, recoveredPrevious };
}
