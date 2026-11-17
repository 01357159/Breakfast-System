import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMenu, MENU_CATEGORIES } from '../../data/menuData';
import { getRemoteMenu } from '../../data/menuService';
import CartModal from './CartModal';
import { customerOrders, placeOrder } from '../../data/orderService';
import { fetchPickupSchedule } from '../../data/pickupService';
import { ORDER_TYPE, TAKEOUT_SEAT, normalizeOrderType, orderTypeLabel } from '../../data/orderTypes';
import './css/Menu.css';

const cartStorageKey = (orderType, seat) => `breakfast_cart_v1:${orderType}:${seat}`;

function loadCart(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

// 會員手機末三碼可作為取餐識別預填值。
function memberRefSuffix(user) {
  const phone = user?.phone || user?.user_metadata?.phone || '';
  return String(phone).replace(/\D/g, '').slice(-3);
}

export default function Menu() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();

  const orderType = normalizeOrderType(searchParams.get('type'));
  const isTakeout = orderType === ORDER_TYPE.TAKEOUT;
  const seatParam = searchParams.get('seat') || 'A-01';
  const seatNumber = isTakeout ? TAKEOUT_SEAT : seatParam;

  const [menuItems, setMenuItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState(MENU_CATEGORIES[0]?.id || '');
  const storageKey = cartStorageKey(orderType, seatNumber);
  const [cart, setCart] = useState(() => loadCart(storageKey));
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 外帶取餐狀態
  const [pickupRef, setPickupRef] = useState(searchParams.get('ref') || '');
  const [pickupRefDirty, setPickupRefDirty] = useState(false);
  const [pickupType, setPickupType] = useState('ASAP');
  const [pickupTime, setPickupTime] = useState(null);
  const [estimatedReadyAt, setEstimatedReadyAt] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  // 訂單隊伍過長提醒視窗
  const [isQueueWarningOpen, setIsQueueWarningOpen] = useState(false);

  // 暫存顧客選擇的取餐時間
  const [pendingPickupTime, setPendingPickupTime] = useState('');
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  const categoryRefs = useRef({});
  const scrollRef = useRef(null);

  const memberRef = memberRefSuffix(auth.user);
  const effectivePickupRef = pickupRefDirty ? pickupRef : (pickupRef || memberRef);

  // 從 Supabase 載入菜單
  useEffect(() => {
    let alive = true;
    let running = false;

    async function syncMenu() {
      if (running) return;

      running = true;

      try {
        const remoteMenu = await getRemoteMenu();

        if (!alive) return;

        setMenuItems(remoteMenu);
        setMenuLoadError('');
      } catch (error) {
        console.error('讀取 Supabase 菜單失敗：', error);

        if (!alive) return;

        // Supabase 讀取失敗時，暫時使用本機菜單
        setMenuItems(getMenu());
        setMenuLoadError('目前無法同步最新菜單，顯示本機備用資料。');
      } finally {
        running = false;

        if (alive) {
          setMenuLoading(false);
        }
      }
    }

    // 頁面開啟時立即讀取
    syncMenu();

    // 每五秒重新讀取，取得老闆最新修改
    const timer = setInterval(() => {
      if (!document.hidden) {
        syncMenu();
      }
    }, 5000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

    // 菜單更新時，同步檢查購物車
  useEffect(() => {
    setCart((prev) => {
      const next = {};

      Object.entries(prev).forEach(([id, quantity]) => {
        const item = menuItems.find(
          (menuItem) => String(menuItem.id) === id
        );

        // 餐點仍存在且正在供應，才保留在購物車
        if (item && item.available !== false) {
          next[id] = quantity;
        }
      });

      return next;
    });
  }, [menuItems]);

  useEffect(() => {
    const cardElement = document.querySelector('.customer-app-card');
    if (cardElement) {
      cardElement.classList.add('menu-mode');
    }
    return () => {
      if (cardElement) {
        cardElement.classList.remove('menu-mode');
      }
    };
  }, []);

  // 載入後端提供的取餐排程（含 ASAP 預估時間與各時段名額）。
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const schedule = await fetchPickupSchedule();
        if (!alive) return;
        setAvailableSlots(schedule.slots);
        setEstimatedReadyAt(schedule.estimatedReadyAt);
        setScheduleError('');
      } catch (error) {
        if (alive) setScheduleError(error.message);
      } finally {
        if (alive) setScheduleLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 購物車依「取餐方式 + 桌號」分開保存，重新整理或誤觸上一頁都不會遺失。
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); }
    catch { /* 儲存空間不足時仍可正常點餐，只是不會保留購物車 */ }
  }, [storageKey, cart]);

  const refreshSchedule = async () => {
    setScheduleLoading(true);
    try {
      const schedule = await fetchPickupSchedule();
      setAvailableSlots(schedule.slots || []);
      setEstimatedReadyAt(schedule.estimatedReadyAt || null);
      setScheduleError('');
      return schedule;
    } catch (error) {
      setScheduleError(error.message);
      return null;
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleScrollToCategory = (catId) => {
    const element = categoryRefs.current[catId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveCategory(catId);
  };

  const handleMenuScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    let current = MENU_CATEGORIES[0]?.id || '';
    for (const cat of MENU_CATEGORIES) {
      const element = categoryRefs.current[cat.id];
      if (element && element.getBoundingClientRect().top - containerTop <= 80) {
        current = cat.id;
      }
    }
    setActiveCategory(current);
  };

  const handleIncrease = (itemId) => {
    setCart(prev => ({
      ...prev,
      [itemId]: Math.min(99, (prev[itemId] || 0) + 1)
    }));
  };

  const handleDecrease = (itemId) => {
    setCart(prev => {
      const currentCount = prev[itemId] || 0;
      if (currentCount <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: currentCount - 1
      };
    });
  };

  const handleRemoveItem = (itemId) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const handlePickupTypeChange = (nextType) => {
    setPickupType(nextType);
    if (nextType === 'ASAP') setPickupTime(null);
  };

  const handlePickupTimeChange = (time) => {
    setPickupTime(time);
    setPickupType('SCHEDULED');
  };

  const handlePickupRefChange = (value) => {
    setPickupRef(value);
    setPickupRefDirty(true);
  };

  // 忽略購物車中已被店家移除的餐點，避免金額計算出現幽靈品項。
  const cartEntries = Object.entries(cart).filter(([id]) =>
    menuItems.some(item => item.id === Number(id))
  );
  const totalCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const totalPrice = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const query = searchText.trim().toLowerCase();
  const filteredItems = menuItems.filter(item => item.available !== false && (
    !query ||
    item.name.toLowerCase().includes(query) ||
    (item.description || '').toLowerCase().includes(query)
  ));

  const refreshOrders = async () => {
    setMyOrders(await customerOrders(seatNumber, isTakeout ? effectivePickupRef.trim() : undefined));
  };

  const handleOpenStatus = async () => {
    setIsStatusOpen(true);
    setOrderError('');
    try { await refreshOrders(); }
    catch (error) { setOrderError(error.message); }
  };

  useEffect(() => {
    if (!isStatusOpen) return;
    let alive = true;
    let running = false;
    const timer = setInterval(async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const next = await customerOrders(seatNumber, isTakeout ? effectivePickupRef.trim() : undefined);
        if (alive) { setMyOrders(next); setOrderError(''); }
      } catch (error) { if (alive) setOrderError(error.message); }
      finally { running = false; }
    }, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isStatusOpen, seatNumber, isTakeout, effectivePickupRef]);

  const handleBackHome = () => {
    const params = new URLSearchParams({ seat: seatParam, type: orderType });
    navigate(`/customer?${params.toString()}`);
  };

  // 結帳：送出前重新向後端確認時段仍有效，再建立訂單。
  const handleCheckout = async ({ pickupType: selectedType } = {}) => {
    if (totalCount === 0 || checkoutBusy) return;
    setCheckoutBusy(true);
    setOrderError('');
    try {
      // 先確認目前製作中的訂單數量
      const activeCount = await getActiveOrderCount();

      if (activeCount >= 10) {
        setPendingPickupTime(pickupTime);
        setIsQueueWarningOpen(true);
        return;
      }
    } catch (error) {
      setOrderError(`檢查隊伍狀態失敗：${error.message}`);
      return;
    }

    let schedule;
    try {
      schedule = await fetchPickupSchedule();
    } catch (error) {
      setOrderError(`無法確認取餐時段：${error.message}。請稍後再試。`);
      return;
    }
    setAvailableSlots(schedule.slots || []);
    setEstimatedReadyAt(schedule.estimatedReadyAt || null);

    const scheduled = isTakeout && selectedType === 'SCHEDULED';
    let finalPickupTime = schedule.estimatedReadyAt;
    if (scheduled) {
      const slot = (schedule.slots || []).find(item => item.time === pickupTime);
      if (!slot || slot.remaining <= 0) {
        setOrderError('該時段已滿，請改選');
        setPickupTime(null);
        return;
      }
      finalPickupTime = slot.time;
    }

    const orderItems = cartEntries.map(([id, qty]) => {
      const item = menuItems.find(i => i.id === Number(id));
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        qty: qty,
        subtotal: item.price * qty
      };
    });

    const newOrder = {
      orderId: 'ORD-' + Date.now().toString().slice(-6),
      orderType,
      seat: seatNumber,
      pickupType: scheduled ? 'scheduled' : 'asap',
      pickupRef: isTakeout ? effectivePickupRef.trim() : '',
      pickupTime: finalPickupTime,
      estimatedReadyAt: schedule.estimatedReadyAt,
      createdDate: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      items: orderItems,
      totalPrice: totalPrice,
      status: 'pending', // pending / accepted / completed / rejected
      queueNumber: null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };

    const submitted = await placeOrder(newOrder);

    if (submitted.recoveredPrevious) {
      alert(`已確認前次訂單！\n取餐方式：${orderTypeLabel(submitted.orderType)}\n${submitted.pickupRef ? `取餐識別：${submitted.pickupRef}\n` : ''}預定取餐：約 ${submitted.pickupTime}\n總金額：$${submitted.totalPrice}\n目前購物車尚未送出，請再次確認送出。`);
      return;
    }

    setCart({});
    setIsCartOpen(false);
    setPlacedOrder(submitted);
  } catch (error) {
    if (error.message.includes('該時段已滿')) {
      setPickupTime(null);
      setOrderError('該時段已滿，請改選');
      try {
        const latest = await fetchPickupSchedule();
        setAvailableSlots(latest.slots || []);
        setEstimatedReadyAt(latest.estimatedReadyAt || null);
      } catch { /* 保留原始錯誤訊息，讓顧客可手動重新整理 */ }
    } else {
      setOrderError(`送出失敗：${error.message}。請重試，重試會安全地確認前次訂單。`);
    }
  } finally { setCheckoutBusy(false); }
};

  // 顧客確認仍要送出
  const handleConfirmQueueOrder = () => {
    const pickupTime = pendingPickupTime;

    setIsQueueWarningOpen(false);
    setPendingPickupTime('');

    // true 代表已經看過提醒，不再重複檢查
    handleCheckout(pickupTime, true);
  };

  // 顧客選擇返回
  const handleBackFromQueueWarning = () => {
    setIsQueueWarningOpen(false);
    setPendingPickupTime('');
  };

  return (
    <div className="menu-container">
      
      {/* 1. 頂部導覽列 */}
      <div className="menu-header">
        <div className="menu-header-main">
          <button className="menu-back-btn" onClick={handleBackHome} title="回到首頁">←</button>
          <span className="menu-title-text">線上點餐系統</span>
        </div>
        <div className="menu-header-actions">
          <span className={`menu-mode-tag ${isTakeout ? 'takeout' : 'dine-in'}`}>
            {isTakeout ? '🥡 外帶' : '🍽️ 內用'}
          </span>
          <span className="menu-seat-tag">
            {isTakeout ? (effectivePickupRef.trim() || '外帶') : `桌號：${seatNumber}`}
          </span>
          <button className="menu-status-check-btn" onClick={() => navigate(`/customer/reviews?seat=${encodeURIComponent(seatParam)}&type=${orderType}`)}>★ 評價</button>
          <button className="menu-status-check-btn" onClick={handleOpenStatus}>
            📋 訂單記錄
          </button>
        </div>
      </div>

      {/* 2. 搜尋 + 橫向分類標籤列 */}
      <div className="menu-search-row">
        <input
          className="menu-search-input"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="搜尋餐點，例如：蛋餅、奶茶"
          aria-label="搜尋餐點"
        />
        {searchText && (
          <button className="menu-search-clear" onClick={() => setSearchText('')} aria-label="清除搜尋">✕</button>
        )}
      </div>

      <div className="menu-tabs-horizontal">
        {MENU_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`menu-tab-chip ${!query && activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleScrollToCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 3. 菜單列表區 */}
      <div className="menu-scroll-area" ref={scrollRef} onScroll={handleMenuScroll}>
        {menuItems.length === 0 ? (
          <p className="menu-empty-message">菜單載入中…</p>
        ) : filteredItems.length === 0 ? (
          <p className="menu-empty-message">
            找不到「{searchText.trim()}」相關餐點，換個關鍵字試試。
          </p>
        ) : (
          MENU_CATEGORIES.map(cat => {
            const itemsInCat = filteredItems.filter(item => item.category === cat.id);
            if (itemsInCat.length === 0) return null;
            return (
              <div 
                key={cat.id} 
                className="menu-category-section"
                ref={el => categoryRefs.current[cat.id] = el}
              >
                <h3 className="menu-category-title">{cat.name}</h3>
                
                <div className="menu-items-grid">
                  {itemsInCat.map(item => {
                    const qty = cart[item.id] || 0;
                    return (
                      <div key={item.id} className="menu-item-card">
                        <div className="menu-item-text-group">
                          <h4 className="menu-item-name">{item.name}</h4>
                          <p className="menu-item-desc">{item.description || '美味推薦，現點現做'}</p>
                          <div className="menu-item-row">
                            <span className="menu-item-price">${item.price}</span>
                            
                            {qty === 0 ? (
                              <button className="menu-plus-btn" onClick={() => handleIncrease(item.id)} aria-label={`加入 ${item.name}`}>
                                +
                              </button>
                            ) : (
                              <div className="menu-counter-control">
                                <button className="counter-btn" onClick={() => handleDecrease(item.id)} aria-label={`減少 ${item.name}`}>-</button>
                                <span className="counter-num">{qty}</span>
                                <button className="counter-btn" onClick={() => handleIncrease(item.id)} aria-label={`增加 ${item.name}`}>+</button>
                              </div>
                            )
                            }
                          </div>
                        </div>
                        <img src={item.image} alt={item.name} className="menu-item-image" loading="lazy" />
                      </div>
                    );
                  })}}
                </div>
              </div>
            );
          }))
        )}
      </div>

      {/* 4. 底部購物車預覽列 */}
      {totalCount > 0 && (
        <div className="menu-footer-bar" onClick={() => setIsCartOpen(true)}>
          <div className="menu-cart-info">
            <span>已選 <b>{totalCount}</b> 項</span>
            <span className="menu-total-price">總計 ${totalPrice}</span>
          </div>
          <button className="menu-checkout-btn">
            查看購物車 ➔
          </button>
        </div>
      )}

      {/* 5. 購物車彈窗 */}
      <CartModal 
        key={isCartOpen ? 'cart-open' : 'cart-closed'}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        menuItems={menuItems}
        seatNumber={seatParam}
        orderType={orderType}
        pickupRef={effectivePickupRef}
        onPickupRefChange={handlePickupRefChange}
        pickupType={pickupType}
        onPickupTypeChange={handlePickupTypeChange}
        pickupTime={pickupTime}
        onPickupTimeChange={handlePickupTimeChange}
        estimatedReadyAt={estimatedReadyAt}
        availableSlots={availableSlots}
        scheduleLoading={scheduleLoading}
        scheduleError={scheduleError}
        onRefreshSchedule={refreshSchedule}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        busy={checkoutBusy}
        error={orderError}
      />

      {/* 6. 送出成功畫面 */}
      {placedOrder && (
        <div className="cart-modal-overlay" onClick={() => setPlacedOrder(null)}>
          <div className="cart-modal-content order-success" onClick={e => e.stopPropagation()}>
            <div className="order-success-icon" aria-hidden="true">🎉</div>
            <h3>訂單已送出！</h3>
            <p className="order-success-sub">店家接單後即可在「訂單記錄」查看製作進度</p>

            <dl className="order-success-list">
              <div><dt>取餐方式</dt><dd>{orderTypeLabel(placedOrder.orderType)}</dd></div>
              {normalizeOrderType(placedOrder.orderType) === ORDER_TYPE.TAKEOUT && placedOrder.pickupRef && (
                <div><dt>取餐識別</dt><dd>{placedOrder.pickupRef}</dd></div>
              )}
              {normalizeOrderType(placedOrder.orderType) === ORDER_TYPE.TAKEOUT ? (
                <div>
                  <dt>{placedOrder.pickupType === 'scheduled' ? '預定取餐' : '盡快取餐'}</dt>
                  <dd>約 {placedOrder.pickupTime}</dd>
                </div>
              ) : (
                <div><dt>桌號</dt><dd>{placedOrder.seat}</dd></div>
              )}
              <div><dt>總金額</dt><dd className="order-success-price">${placedOrder.totalPrice}</dd></div>
              <div><dt>訂單編號</dt><dd>#{placedOrder.orderId}</dd></div>
            </dl>

            <div className="order-success-actions">
              <button className="cart-submit-btn" onClick={() => { setPlacedOrder(null); handleOpenStatus(); }}>
                查看訂單狀態
              </button>
              <button className="order-success-secondary" onClick={() => setPlacedOrder(null)}>
                繼續點餐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 訂單隊伍過長提醒視窗 */}
      {isQueueWarningOpen && (
        <div
          className="cart-modal-overlay"
          onClick={handleBackFromQueueWarning}
        >
          <div
            className="cart-modal-content queue-warning-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="queue-warning-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-modal-header">
              <h3 id="queue-warning-title">⏳ 訂單提醒</h3>
            </div>

            <div className="queue-warning-body">
              <p>
                目前訂單隊伍較長，需要額外等候時間。
              </p>

              <p>
                請問是否仍要送出訂單？
              </p>
            </div>

            <div className="queue-warning-actions">
              <button
                type="button"
                className="queue-back-btn"
                onClick={handleBackFromQueueWarning}
              >
                返回
              </button>

              <button
                type="button"
                className="queue-confirm-btn"
                onClick={handleConfirmQueueOrder}
                disabled={checkoutBusy}
              >
                仍要送出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. 訂單記錄面板 */}
      {isStatusOpen && (
        <div className="cart-modal-overlay" onClick={() => setIsStatusOpen(false)}>
          <div className="cart-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h3>📋 訂單狀態</h3>
              <button className="cart-close-btn" onClick={() => setIsStatusOpen(false)}>✕</button>
            </div>

            <div className="cart-items-list order-status-list">
              {orderError && <p role="alert" className="order-status-error">{orderError}</p>}
              {myOrders.length === 0 ? (
                <p className="order-status-empty">目前沒有訂單紀錄</p>
              ) : (
                myOrders.map(order => (
                  <div key={order.orderId} className="order-status-card">
                    <div className="order-status-meta">
                      <span>編號: {order.orderId}</span>
                      <span>{order.createdAt}</span>
                    </div>

                    <div className="order-status-line">
                      <span className={`order-status-type ${normalizeOrderType(order.orderType)}`}>
                        {orderTypeLabel(order.orderType)}
                      </span>
                      <span className="order-status-where">
                        {normalizeOrderType(order.orderType) === ORDER_TYPE.TAKEOUT
                          ? `取餐識別：${order.pickupRef || '—'}` 
                          : `桌號：${order.seat}`}
                      </span>
                    </div>

                    {/* 叫號顯示：有取餐識別時附在訂單號後 */}
                    <div className="order-callout">
                      #{order.orderId}{order.pickupRef ? ` · ${order.pickupRef}` : ''}
                    </div>

                    {/* 精簡狀態顯示 */}
                    <div className="order-status-state">
                      {order.status === 'pending' && <span className="state-pending">⏳ 等待接單中</span>}
                      {order.status === 'accepted' && <span className="state-accepted">🍳 製作中 {order.queueNumber && `(序號 #${order.queueNumber})`}</span>}
                      {order.status === 'completed' && <span className="state-completed">✅ 餐點已完成請取餐</span>}
                      {order.status === 'completed' && supabase && <button className="menu-status-check-btn" onClick={() => navigate(`/customer/reviews?seat=${encodeURIComponent(seatParam)}&type=${orderType}`)}>★ 登入並評論這次用餐</button>}
                      {order.status === 'rejected' && <span className="state-rejected">❌ 已被婉拒</span>}
                    </div>

                    <div className="order-status-pickup">
                      {order.pickupType === 'scheduled' ? '預定取餐' : '盡快取餐'}：<b>約 {order.pickupTime}</b>
                    </div>

                    <div className="order-status-items">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="order-status-item">
                          <span>{it.name} x {it.qty}</span>
                          <span>${it.subtotal}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-status-total">
                      總計：${order.totalPrice}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-modal-footer">
              <button className="cart-submit-btn" onClick={handleOpenStatus}>
                重新整理狀態
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}