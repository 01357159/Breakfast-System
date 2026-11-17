import { useState } from 'react';
import { ORDER_TYPE, normalizeOrderType } from '../../data/orderTypes';
import { FIRST_SLOT_PAGE, isLowStock, isSlotSelectable } from '../../data/pickupService';
import './css/CartModal.css';

export default function CartModal({ 
  isOpen, 
  onClose, 
  cart, 
  menuItems, 
  seatNumber, 
  orderType = ORDER_TYPE.DINE_IN,
  pickupRef = '',
  onPickupRefChange,
  pickupType = 'ASAP',
  onPickupTypeChange,
  pickupTime = null,
  onPickupTimeChange,
  estimatedReadyAt = null,
  availableSlots = [],
  scheduleLoading = false,
  scheduleError = '',
  onRefreshSchedule,
  onIncrease, 
  onDecrease, 
  onRemoveItem, 
  onCheckout,
  busy = false,
  error = ''
}) {
  const [showAllSlots, setShowAllSlots] = useState(false);
  const isTakeout = normalizeOrderType(orderType) === ORDER_TYPE.TAKEOUT;
  const isScheduled = pickupType === 'SCHEDULED';
  const timeMissing = isTakeout && isScheduled && !pickupTime;

  if (!isOpen) return null;

  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const visibleSlots = showAllSlots ? availableSlots : availableSlots.slice(0, FIRST_SLOT_PAGE);  const hasMoreSlots = availableSlots.length > FIRST_SLOT_PAGE;

  const handleConfirmCheckout = () => {
    if (busy || timeMissing) return;
    onCheckout({ pickupType, pickupTime, pickupRef });
  };

  const handlePickSlot = (slot) => {
    if (!isSlotSelectable(slot)) return;
    onPickupTypeChange?.('SCHEDULED');
    onPickupTimeChange?.(slot.time);
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
          {/* 取餐方式摘要 */}
          <div className={`checkout-mode-summary ${isTakeout ? 'takeout' : 'dine-in'}`}>
            <span className="checkout-mode-badge">{isTakeout ? '🥡 外帶' : '🍽️ 內用'}</span>
            <span className="checkout-mode-detail">
              {isTakeout ? '餐點完成後到櫃台取餐' : `內用桌號 ${seatNumber}`}
            </span>
          </div>

          {/* 外帶才顯示：取餐識別 */}
          {isTakeout && (
            <section className="checkout-block">
              <div className="checkout-block-heading">
                <h4>取餐識別</h4>
                <span>選填</span>
              </div>
              <input
                type="text"
                className="checkout-ref-input"
                value={pickupRef}
                maxLength={20}
                placeholder="可填稱呼或手機末三碼"
                disabled={busy}
                onChange={(event) => onPickupRefChange?.(event.target.value)}
              />
              <small className="checkout-block-hint">方便叫號時識別，不填也能送出</small>
            </section>
          )}

          {/* 外帶才顯示：預定取餐時間 */}
          {isTakeout && (
            <section className="checkout-block">
              <div className="checkout-block-heading">
                <h4>預定取餐時間</h4>
                <button
                  type="button"
                  className="schedule-refresh-btn"
                  disabled={busy || scheduleLoading}
                  onClick={onRefreshSchedule}
                >
                  {scheduleLoading ? '更新中…' : '重新整理'}
                </button>
              </div>

              {scheduleError && <p className="checkout-schedule-error" role="alert">{scheduleError}</p>}

              <button
                type="button"
                className={`asap-option ${!isScheduled ? 'active' : ''}`}
                disabled={busy}
                onClick={() => onPickupTypeChange?.('ASAP')}
                aria-pressed={!isScheduled}
              >
                <span className="asap-label">盡快取餐</span>
                <span className="asap-estimate">
                  {estimatedReadyAt ? `約 ${estimatedReadyAt}` : '計算中…'}
                </span>
              </button>

              <div className={`pickup-slot-grid ${showAllSlots ? 'expanded' : ''}`}>
                {visibleSlots.map(slot => {
                  const disabled = !isSlotSelectable(slot);
                  const active = isScheduled && pickupTime === slot.time;
                  return (
                    <button
                      type="button"
                      key={slot.time}
                      className={`pickup-slot-btn ${active ? 'active' : ''} ${disabled ? 'soldout' : ''}`}
                      disabled={busy || disabled}
                      onClick={() => handlePickSlot(slot)}
                      aria-pressed={active}
                    >
                      <span className="pickup-slot-time">約 {slot.time}</span>
                      {disabled ? (
                        <small>已滿</small>
                      ) : isLowStock(slot) ? (
                        <small className="low-stock">剩少量</small>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {!scheduleLoading && availableSlots.length === 0 && (
                <p className="checkout-schedule-empty">目前沒有可選時段，請重新整理。</p>
              )}

              {hasMoreSlots && (
                <button
                  type="button"
                  className="pickup-more-btn"
                  disabled={busy}
                  onClick={() => setShowAllSlots(current => !current)}
                >
                  {showAllSlots ? '收合時段' : '選擇其他時間'}
                </button>
              )}
            </section>
          )}

          <div className="cart-modal-total">
            {isTakeout
              ? (
                <span>
                  取餐識別：<b>{pickupRef.trim() || '未填'}</b>
                </span>
              )
              : <span>桌號：<b>{seatNumber}</b></span>}
            <span className="cart-modal-total-price">總金額：${totalPrice}</span>
          </div>

          <div className="cart-checkout-sticky">
            {error && <p role="alert" className="cart-modal-error">{error}</p>}
            <button
              className="cart-submit-btn"
              disabled={busy || timeMissing}
              onClick={handleConfirmCheckout}
            >
              {busy ? '送出中…' : timeMissing ? '請選擇取餐時間' : '確認送出訂單'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
