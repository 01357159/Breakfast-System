import { useState } from 'react';
import { ORDER_TYPE, ORDER_MODE, normalizeOrderType } from '../../data/orderTypes';
import { FIRST_SLOT_PAGE, isLowStock, isSlotSelectable } from '../../data/pickupService';
import './css/CartModal.css';

export default function CartModal({
  isOpen,
  onClose,
  cart,
  menuItems,
  seatNumber,
  orderType = ORDER_TYPE.DINE_IN,
  mode = 'DINE_IN',
  isSubOrder = false,
  mainSummary = null,
  subSummary = null,
  queue = null,
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
  error = '',
}) {
  const [showAllSlots, setShowAllSlots] = useState(false);
  const isTakeout = mode === ORDER_MODE.TAKEOUT || normalizeOrderType(orderType) === ORDER_TYPE.TAKEOUT;
  const isScheduled = pickupType === 'SCHEDULED';
  const timeMissing = isTakeout && isScheduled && !pickupTime;

  if (!isOpen) return null;

  const entries = Object.entries(cart).filter(([id]) =>
    menuItems.some((item) => item.id === Number(id))
  );
  const totalQty = entries.reduce((sum, [, qty]) => sum + Number(qty), 0);
  const totalPrice = entries.reduce((sum, [id, qty]) => {
    const item = menuItems.find((i) => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const combinedTotal = totalPrice + (subSummary?.total || 0);
  const visibleSlots = showAllSlots ? availableSlots : availableSlots.slice(0, FIRST_SLOT_PAGE);
  const hasMoreSlots = availableSlots.length > FIRST_SLOT_PAGE;

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
      <div className="cart-modal-content cart-modal-compact" onClick={(e) => e.stopPropagation()}>
        <header className="cart-modal-header">
          <div className="cart-modal-heading">
            <span className="cart-modal-icon" aria-hidden="true">
              {isTakeout || isSubOrder ? '🥡' : '🍽️'}
            </span>
            <div className="cart-modal-heading-text">
              <h3>{isSubOrder ? '外帶子單' : isTakeout ? '外帶購物車' : '內用購物車'}</h3>
              <p>
                {isTakeout
                  ? `取餐識別：${pickupRef.trim() || '未填'}`
                  : `桌號 ${seatNumber}`}
                {totalQty > 0 && ` · ${totalQty} 份`}
              </p>
            </div>
          </div>
          <button className="cart-close-btn" disabled={busy} onClick={onClose} aria-label="關閉購物車">
            ✕
          </button>
        </header>

        <div className="cart-modal-body">
          {entries.length === 0 ? (
            <p className="cart-empty">購物車是空的</p>
          ) : (
            <ul className="cart-items-list">
              {entries.map(([id, qty]) => {
                const item = menuItems.find((i) => i.id === Number(id));
                return (
                  <li key={id} className="cart-modal-item">
                    <div className="cart-item-main">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-unit">${item.price} / 份</span>
                    </div>
                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <button
                          type="button"
                          className="qty-btn"
                          disabled={busy}
                          onClick={() => onDecrease(Number(id))}
                          aria-label={`減少 ${item.name}`}
                        >
                          −
                        </button>
                        <span className="qty-num">{qty}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          disabled={busy}
                          onClick={() => onIncrease(Number(id))}
                          aria-label={`增加 ${item.name}`}
                        >
                          ＋
                        </button>
                      </div>
                      <span className="cart-item-subtotal">${item.price * qty}</span>
                      <button
                        type="button"
                        className="cart-item-remove"
                        disabled={busy}
                        onClick={() => onRemoveItem(Number(id))}
                        title="移除此品項"
                        aria-label={`移除 ${item.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span className="cart-summary-label">小計</span>
              <b className="cart-summary-price">
                ${subSummary ? combinedTotal : totalPrice}
              </b>
            </div>

            {(estimatedReadyAt || queue) && (
              <div className="cart-summary-meta">
                {estimatedReadyAt && (
                  <span className="cart-meta-chip">⏱ 預估 {estimatedReadyAt}</span>
                )}
                {queue && (
                  <span className="cart-meta-chip">
                    👥 前方 {queue.count} 單 · 約 {queue.estimatedMinutes} 分鐘
                  </span>
                )}
              </div>
            )}

            {subSummary && (
              <div className="cart-split">
                <span>🍽️ 內用 {mainSummary?.count || 0} 份 · ${mainSummary?.total || 0}</span>
                <span>🥡 外帶 {subSummary.count} 份 · ${subSummary.total}</span>
              </div>
            )}
          </div>

          {isTakeout && (
            <div className="cart-pickup">
              <input
                type="text"
                className="checkout-ref-input"
                value={pickupRef}
                maxLength={20}
                placeholder="取餐識別（稱呼或手機末三碼，選填）"
                disabled={busy}
                onChange={(event) => onPickupRefChange?.(event.target.value)}
              />

              <div className="cart-pickup-modes">
                <button
                  type="button"
                  className={!isScheduled ? 'active' : ''}
                  disabled={busy}
                  onClick={() => onPickupTypeChange?.('ASAP')}
                >
                  盡快取餐{estimatedReadyAt ? `（約 ${estimatedReadyAt}）` : ''}
                </button>
                <button
                  type="button"
                  className={isScheduled ? 'active' : ''}
                  disabled={busy}
                  onClick={() => onPickupTypeChange?.('SCHEDULED')}
                >
                  預定時間
                </button>
              </div>

              {isScheduled && (
                <>
                  {scheduleError && <p className="checkout-schedule-error" role="alert">{scheduleError}</p>}
                  <div className={`pickup-slot-grid ${showAllSlots ? 'expanded' : ''}`}>
                    {visibleSlots.map((slot) => {
                      const disabled = !isSlotSelectable(slot);
                      const active = pickupTime === slot.time;
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
                          {disabled ? <small>已滿</small> : isLowStock(slot) ? <small className="low-stock">剩少量</small> : null}
                        </button>
                      );
                    })}
                  </div>
                  {hasMoreSlots && (
                    <button
                      type="button"
                      className="pickup-more-btn"
                      disabled={busy}
                      onClick={() => setShowAllSlots((current) => !current)}
                    >
                      {showAllSlots ? '收合時段' : '更多時間'}
                    </button>
                  )}
                  {!scheduleLoading && availableSlots.length === 0 && (
                    <p className="checkout-schedule-empty">目前沒有可選時段。</p>
                  )}
                  {onRefreshSchedule && (
                    <button
                      type="button"
                      className="schedule-refresh-btn"
                      disabled={busy || scheduleLoading}
                      onClick={onRefreshSchedule}
                    >
                      {scheduleLoading ? '更新中…' : '重新整理時間'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
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
          <p className="cart-footnote">未送出的購物車保留 2 小時</p>
        </div>
      </div>
    </div>
  );
}
