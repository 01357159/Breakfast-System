// 訂單取餐方式的共用定義，顧客端與老闆端都使用同一組值。
export const ORDER_TYPE = {
  DINE_IN: 'dine-in',
  TAKEOUT: 'takeout',
};

export const ORDER_TYPE_LABEL = {
  [ORDER_TYPE.DINE_IN]: '內用',
  [ORDER_TYPE.TAKEOUT]: '外帶',
};

// 新版訂單模型使用大寫 mode，舊資料仍以 orderType 儲存，兩者互相對應。
export const ORDER_MODE = {
  DINE_IN: 'DINE_IN',
  TAKEOUT: 'TAKEOUT',
};

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  MAKING: 'MAKING',
  DONE: 'DONE',
};

// 內用以外帶時，資料庫既有的 seat 欄位改用固定值，避免破壞舊資料結構。
export const TAKEOUT_SEAT = '外帶';

export function normalizeOrderType(value) {
  if (value === ORDER_TYPE.TAKEOUT || value === ORDER_MODE.TAKEOUT) return ORDER_TYPE.TAKEOUT;
  return ORDER_TYPE.DINE_IN;
}

export function orderTypeLabel(value) {
  return ORDER_TYPE_LABEL[normalizeOrderType(value)];
}

export function normalizeMode(value, fallbackType) {
  if (value === ORDER_MODE.TAKEOUT) return ORDER_MODE.TAKEOUT;
  if (value === ORDER_MODE.DINE_IN) return ORDER_MODE.DINE_IN;
  return normalizeOrderType(value || fallbackType) === ORDER_TYPE.TAKEOUT
    ? ORDER_MODE.TAKEOUT
    : ORDER_MODE.DINE_IN;
}

export function modeLabel(value) {
  return normalizeMode(value) === ORDER_MODE.TAKEOUT ? '外帶' : '內用';
}

// 舊資料（orderType / seat）與新模型（mode / tableId）都吃得下的轉換。
export function orderModeOf(order) {
  if (!order) return ORDER_MODE.DINE_IN;
  if (order.mode) return normalizeMode(order.mode);
  return normalizeMode(order.orderType);
}

export function orderTableIdOf(order) {
  if (!order) return null;
  if (order.mode) return order.tableId || null;
  return normalizeOrderType(order.orderType) === ORDER_TYPE.TAKEOUT ? null : (order.seat || null);
}
