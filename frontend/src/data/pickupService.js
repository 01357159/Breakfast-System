import { supabase, rpc } from '../lib/supabase';
import { readLocalOrders } from './orderService';

// 外帶取餐排程規則：10 分鐘一檔、每檔 6 單、基本備餐 15 分鐘 + 每筆進行中訂單 5 分鐘。
export const SLOT_MINUTES = 10;
export const SLOT_CAPACITY = 6;
export const PREP_MINUTES = 15;
export const MINUTES_PER_ORDER = 5;
export const FIRST_SLOT_PAGE = 6;
export const LOW_STOCK_THRESHOLD = 2;

const pad = (value) => String(value).padStart(2, '0');
const toHHMM = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function roundUpTo(date, stepMinutes) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil(next.getMinutes() / stepMinutes) * stepMinutes);
  return next;
}

// 本機模式（未設定 Supabase）時，用 localStorage 訂單模擬後端排程。
// 預估時間會把「所有進行中訂單」算進去，內用與外帶共用同一條隊伍。
function localSchedule() {
  const now = new Date();
  const active = readLocalOrders().filter(order =>
    ['pending', 'accepted', 'making'].includes(order.status)
  );
  const takeoutCount = active.filter(order => order.orderType === 'takeout').length;
  const queueMinutes = active.length * MINUTES_PER_ORDER;
  const estimate = roundUpTo(
    new Date(now.getTime() + (PREP_MINUTES + queueMinutes) * 60000),
    5
  );
  const first = roundUpTo(new Date(now.getTime() + 30 * 60000), SLOT_MINUTES);
  const today = dayKey(now);
  const scheduled = readLocalOrders().filter(order =>
    order.createdDate === today &&
    order.pickupType === 'scheduled' &&
    order.status !== 'rejected'
  );

  const slots = [];
  for (let i = 0; i < 24; i++) {
    const at = new Date(first.getTime() + i * SLOT_MINUTES * 60000);
    if (dayKey(at) !== today) break;
    const time = toHHMM(at);
    const used = scheduled.filter(order => order.pickupTime === time).length;
    slots.push({ time, remaining: Math.max(0, SLOT_CAPACITY - used) });
  }

  return {
    estimatedReadyAt: toHHMM(estimate),
    estimatedMinutes: PREP_MINUTES + queueMinutes,
    queueCount: active.length,
    takeoutCount,
    dineInCount: active.length - takeoutCount,
    slots,
  };
}

export async function fetchPickupSchedule() {
  if (!supabase) return localSchedule();
  return rpc('pickup_schedule');
}

export function isSlotSelectable(slot) {
  return !!slot && slot.remaining > 0;
}

export function isLowStock(slot) {
  return !!slot && slot.remaining > 0 && slot.remaining <= LOW_STOCK_THRESHOLD;
}

export function formatPickupTime(time) {
  return time ? `約 ${time}` : '';
}
