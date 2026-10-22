export function getReviewComposerState({ user, isOwner, authError, orders = [] }) {
  if (!user) {
    return { canWrite: false, defaultOrderId: '', available: [], message: '請先使用 Google 登入。' };
  }
  if (authError) {
    return { canWrite: false, defaultOrderId: '', available: [], message: `無法確認帳號權限：${authError}` };
  }
  if (isOwner) {
    return { canWrite: false, defaultOrderId: '', available: [], message: '店家帳號只能回覆評論，不能撰寫顧客評論。' };
  }

  const available = orders.filter(order => !order.review_id);
  if (!available.length) {
    return {
      canWrite: false,
      defaultOrderId: '',
      available,
      message: '目前找不到可評論的訂單。請先用同一個瀏覽器完成點餐，並等店家標記為已完成，再按重新整理。',
    };
  }

  return {
    canWrite: true,
    defaultOrderId: available.length === 1 ? available[0].orderId : '',
    available,
    message: `找到 ${available.length} 筆可評論的已完成訂單。`,
  };
}
