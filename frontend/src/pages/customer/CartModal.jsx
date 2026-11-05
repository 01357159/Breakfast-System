import { useState } from 'react';
import './css/CartModal.css';

export default function CartModal({ 
  isOpen, 
  onClose, 
  cart, 
  menuItems, 
  seatNumber, 
  onIncrease, 
  onDecrease, 
  onRemoveItem, 
  onCheckout,
  busy = false,
  error = ''
}) {
  // 動態生成未來 4 個取餐時間選項（每 10 分鐘一檔）
  const generateTimeOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 1; i <= 4; i++) {
      const time = new Date(now.getTime() + i * 10 * 60000);
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      options.push(`${hours}:${minutes}`);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();
  const [pickupTime, setPickupTime] = useState(timeOptions[0]); // 預設選第一個

  if (!isOpen) return null;

  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handleConfirmCheckout = () => {
    if (busy) return;
    onCheckout(pickupTime);
  };

  return (
    <div className="cart-modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="cart-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* 彈窗標題 */}
        <div className="cart-modal-header">
          <h3>🛒 您的購物車明細</h3>
          <button className="cart-close-btn" disabled={busy} onClick={onClose}>✕</button>
        </div>

        {/* 購物車品項清單 */}
        <div className="cart-items-list">
          {Object.entries(cart).map(([id, qty]) => {
            const item = menuItems.find(i => i.id === Number(id));
            if (!item) return null;
            return (
              <div key={id} className="cart-modal-item">
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price-sub">${item.price * qty}</span>
                </div>

                <div className="cart-item-actions">
                  <div className="menu-counter-control">
                    <button className="counter-btn" disabled={busy} onClick={() => onDecrease(Number(id))}>-</button>
                    <span className="counter-num">{qty}</span>
                    <button className="counter-btn" disabled={busy} onClick={() => onIncrease(Number(id))}>+</button>
                  </div>
                  
                  <button className="cart-delete-item-btn" disabled={busy} onClick={() => onRemoveItem(Number(id))} title="移除此品項">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部結帳區 */}
        <div className="cart-modal-footer">
          
          {/* 💡 取餐時間改用美觀的點擊按鈕群組，不再使用原生 select */}
          <div className="checkout-setting-group">
            <span className="setting-label">預定取餐時間：</span>
            <div className="pickup-time-chips">
              {timeOptions.map(time => (
                <button
                  type="button"
                  key={time}
                  disabled={busy}
                  className={`pickup-time-chip ${pickupTime === time ? 'active' : ''}`}
                  onClick={() => setPickupTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="cart-modal-total">
            <span>桌號：<b>{seatNumber}</b></span>
            <span className="cart-modal-total-price">總金額：${totalPrice}</span>
          </div>

          {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          <button className="cart-submit-btn" disabled={busy} onClick={handleConfirmCheckout}>
            {busy ? '送出中…' : '確認送出訂單'}
          </button>
        </div>

      </div>
    </div>
  );
}
