import { supabase, rpc } from '../lib/supabase';
import { receiptKey, submitGuestOrder } from './guestCheckout';
import { ORDER_MODE, ORDER_STATUS, normalizeMode, normalizeOrderType } from './orderTypes';

const ORDERS_KEY = 'breakfast_orders';
const PICKUP_SEQ_KEY = 'breakfast_pickup_seq';
const ACTIVE_STATUSES = ['pending', 'accepted', 'making'];
const ESTIMATED_MINUTES_PER_ORDER = 5;

// 新舊欄位並存的訂單物件，讓既有畫面與新 model 都能運作。
export function completeOrderModel(order) {
  const mode = normalizeMode(order.mode, order.orderType);
  const orderType = mode === ORDER_MODE.TAKEOUT ? 'takeout' : 'dine-in';
  return {
    ...order,
    mode,
    orderType,
    tableId: mode === ORDER_MODE.TAKEOUT ? null : (order.tableId ?? order.seat ?? null),
    parentOrderId: order.parentOrderId || null,
    ownerSeat: order.ownerSeat || null,
    pickupRef: order.pickupRef || null,
    pickupType: order.pickupType === 'SCHEDULED' || order.pickupType === 'scheduled' ? 'scheduled' : 'asap',
    pickupTime: order.pickupTime || null,
    status: order.status || 'pending',
    pickupNo: order.pickupNo || null,
    refundStatus: order.refundStatus || 'NOT_REQUIRED',
    items: Array.isArray(order.items) ? order.items : [],
  };
}

export function statusLabel(status) {
  const map = {
    [ORDER_STATUS.PENDING]: '等待接單',
    [ORDER_STATUS.ACCEPTED]: '已接單',
    [ORDER_STATUS.MAKING]: '製作中',
    [ORDER_STATUS.DONE]: '已完成',
    [ORDER_STATUS.REJECTED]: '已婉拒',
    pending: '等待接單',
    accepted: '製作中',
    making: '製作中',
    completed: '已完成',
    rejected: '已婉拒',
  };
  return map[status] || status;
}

export function readLocalOrders() {
  try {
    const data = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function writeLocalOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function readReceipts() {
  // Do not discard damaged receipts and silently lose access to previous orders.
  const data = JSON.parse(localStorage.getItem(receiptKey) || '[]');
  if (!Array.isArray(data)) throw new Error('訂單收據無法讀取，請勿清除瀏覽器資料並聯絡店家。');
  return data;
}

export async function placeOrder(order) {
  const normalized = completeOrderModel(order);
  if (!supabase) {
    const local = { ...normalized, orderId: normalized.orderId || `LOCAL-${crypto.randomUUID()}` };
    writeLocalOrders([local, ...readLocalOrders()]);
    return local;
  }
  return submitGuestOrder({
    order: normalized, storage: localStorage, call: rpc, randomId: () => crypto.randomUUID(),
    randomToken: () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''),
  });
}

export async function customerOrders(seat, pickupRef) {
  if (!supabase) {
    return readLocalOrders().filter(order => {
      const belongsToSeat = order.seat === seat || order.tableId === seat || order.ownerSeat === seat;
      if (!belongsToSeat) return false;
      if (!pickupRef) return true;
      return (order.pickupRef || '') === pickupRef || order.ownerSeat === seat;
    });
  }
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

// 目前進行中的訂單數量（內用＋外帶）
export async function getActiveOrderCount() {
  const queue = await getQueueAhead();
  return queue.count;
}

// 前方佇列：內用與外帶一起計算，回傳總數、分類數量與預估等待分鐘
export async function getQueueAhead({ excludeIds = [] } = {}) {
  const exclude = new Set(excludeIds.filter(Boolean));
  if (!supabase) {
    const active = readLocalOrders().filter(order =>
      ACTIVE_STATUSES.includes(order.status) && !exclude.has(order.orderId)
    );
    const takeoutCount = active.filter(order => normalizeOrderType(order.orderType) === 'takeout').length;
    return {
      count: active.length,
      takeoutCount,
      dineInCount: active.length - takeoutCount,
      estimatedMinutes: active.length * ESTIMATED_MINUTES_PER_ORDER,
    };
  }
  const data = await rpc('queue_ahead');
  const count = Number(data?.count || 0);
  return {
    count,
    takeoutCount: Number(data?.takeoutCount || 0),
    dineInCount: Number(data?.dineInCount || 0),
    estimatedMinutes: Number(data?.estimatedMinutes || count * ESTIMATED_MINUTES_PER_ORDER),
  };
}

// 舊名稱保留，回傳的 count 為全部進行中訂單
export const getTakeoutQueueAhead = getQueueAhead;

// 取餐序號：每天從 001 開始，接單後才產生。
export function nextPickupNo(date = new Date()) {
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  let seq = { date: dateKey, value: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(PICKUP_SEQ_KEY) || 'null');
    if (saved?.date === dateKey) seq = saved;
  } catch { /* 忽略毀損的序號資料，重新從 001 開始 */ }
  const next = Number(seq.value || 0) + 1;
  localStorage.setItem(PICKUP_SEQ_KEY, JSON.stringify({ date: dateKey, value: next }));
  return String(next).padStart(3, '0');
}

export async function setOrderStatus(id, status) {
  if (supabase) return rpc('set_order_status', { p_id: id, p_status: status });
  let updated = null;
  writeLocalOrders(readLocalOrders().map(order => {
    if (order.orderId !== id) return order;
    const next = { ...order, status };
    // 外帶單接受後才產生取餐序號，內用單一律不產生。
    if (status === 'accepted' && normalizeOrderType(order.orderType) === 'takeout' && !order.pickupNo) {
      next.pickupNo = nextPickupNo();
    }
    updated = next;
    return next;
  }));
  return updated;
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
