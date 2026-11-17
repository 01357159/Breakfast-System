// 訂單取餐方式的共用定義，顧客端與老闆端都使用同一組值。
export const ORDER_TYPE = {
  DINE_IN: 'dine-in',
  TAKEOUT: 'takeout',
};

export const ORDER_TYPE_LABEL = {
  [ORDER_TYPE.DINE_IN]: '內用',
  [ORDER_TYPE.TAKEOUT]: '外帶',
};

// 內用以外帶時，資料庫既有的 seat 欄位改用固定值，避免破壞舊資料結構。
export const TAKEOUT_SEAT = '外帶';

export function normalizeOrderType(value) {
  return value === ORDER_TYPE.TAKEOUT ? ORDER_TYPE.TAKEOUT : ORDER_TYPE.DINE_IN;
}

export function orderTypeLabel(value) {
  return ORDER_TYPE_LABEL[normalizeOrderType(value)];
}
