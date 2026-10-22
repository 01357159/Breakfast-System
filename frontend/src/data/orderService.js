import { supabase, rpc } from '../lib/supabase';
import { receiptKey, submitGuestOrder } from './guestCheckout';

export function readLocalOrders() {
  try {
    const data = JSON.parse(localStorage.getItem('breakfast_orders') || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
export function readReceipts() {
  // Do not discard damaged receipts and silently lose access to previous orders.
  const data = JSON.parse(localStorage.getItem(receiptKey) || '[]');
  if (!Array.isArray(data)) throw new Error('訂單收據無法讀取，請勿清除瀏覽器資料並聯絡店家。');
  return data;
}
export async function placeOrder(order) {
  if (!supabase) {
    const local = { ...order, orderId: `LOCAL-${crypto.randomUUID()}` };
    localStorage.setItem('breakfast_orders', JSON.stringify([local, ...readLocalOrders()]));
    return local;
  }
  return submitGuestOrder({
    order, storage: localStorage, call: rpc, randomId: () => crypto.randomUUID(),
    randomToken: () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join(''),
  });
}
export async function customerOrders(seat) {
  if (!supabase) return readLocalOrders().filter(order => order.seat === seat);
  const orders = await Promise.all(readReceipts().map(({ id, receipt }) => rpc('guest_order', {
    p_id: id, p_receipt: receipt,
  }).catch(error => {
    // A receipt is stored before submission. An interrupted request may not have created its order.
    if (error.message.includes('query returned no rows')) return null;
    throw error;
  })));
  // Receipts are appended chronologically, independent of random order UUIDs.
  return orders.filter(Boolean).reverse();
}
export const ownerOrders = () => supabase ? rpc('owner_orders') : Promise.resolve(readLocalOrders());
export async function setOrderStatus(id, status) {
  if (supabase) return rpc('set_order_status', { p_id: id, p_status: status });
  localStorage.setItem('breakfast_orders', JSON.stringify(readLocalOrders().map(
    order => order.orderId === id ? { ...order, status } : order,
  )));
}
export async function claimReceiptOrders() {
  const receipts = readReceipts();
  const orders = await customerOrders();
  const errors = [];
  for (const order of orders.filter(o => o.status === 'completed')) {
    const receipt = receipts.find(r => r.id === order.orderId);
    try { await rpc('claim_order', { p_id: order.orderId, p_receipt: receipt.receipt }); }
    catch (error) { errors.push(error.message); }
  }
  return errors;
}
