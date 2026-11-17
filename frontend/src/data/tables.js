// 店內桌號清單：新增／移除桌位時只需修改這裡，QR Code 頁面會同步更新。
export const TABLE_IDS = [
  'A-01', 'A-02', 'A-03', 'A-04', 'A-05', 'A-06',
  'A-07', 'A-08', 'A-09', 'A-10', 'A-11', 'A-12',
];

export const DINE_IN_PATH = (tableId) => `/t/${encodeURIComponent(tableId)}`;
export const TAKEOUT_PATH = '/takeout';
