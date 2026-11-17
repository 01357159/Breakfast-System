import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMenu, MENU_CATEGORIES } from '../../data/menuData';
import { getRemoteMenu } from '../../data/menuService';
import CartModal from './CartModal';
import { customerOrders, placeOrder, getActiveOrderCount, getQueueAhead, statusLabel } from '../../data/orderService';
import { fetchPickupSchedule } from '../../data/pickupService';
import { ORDER_TYPE, ORDER_MODE, TAKEOUT_SEAT, normalizeOrderType, normalizeMode, orderTypeLabel } from '../../data/orderTypes';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/authContext';
import './css/Menu.css';

const CART_TTL_MS = 2 * 60 * 60 * 1000; // 購物車閒置 2 小時自動清空
const cartStorageKey = (mode, seat) => `breakfast_cart_v1:${mode}:${seat}`;
const subCartStorageKey = (seat) => `breakfast_subcart_v1:${seat}`;
const cartTimeKey = (key) => `${key}:updatedAt`;

function loadCart(key) {
  try {
    const staleAt = Number(localStorage.getItem(cartTimeKey(key)) || 0);
    if (staleAt && Date.now() - staleAt > CART_TTL_MS) {
      localStorage.removeItem(key);
      localStorage.removeItem(cartTimeKey(key));
      return {};
    }
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

// 只保留菜單上仍存在的品項，並移除數量為 0 的項目。
function organizeCart(cart, menuItems) {
  const next = {};
  Object.entries(cart || {}).forEach(([id, qty]) => {
    const count = Number(qty) || 0;
    if (count > 0 && menuItems.some(item => item.id === Number(id))) {
      next[id] = Math.min(99, count);
    }
  });
  return next;
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

  const orderType = normalizeOrderType(searchParams.get('type') || searchParams.get('mode'));
  const mode = normalizeMode(searchParams.get('mode'), orderType);
  const isTakeout = mode === ORDER_MODE.TAKEOUT;
  const seatParam = searchParams.get('seat') || 'A-01';
  const seatNumber = isTakeout ? TAKEOUT_SEAT : seatParam;
  // 桌邊碼會鎖定桌號，顧客不可自行改桌
  const tableId = isTakeout ? null : seatParam;

  const [menuItems, setMenuItems] = useState(() => (supabase ? [] : getMenu()));
  const [menuLoading, setMenuLoading] = useState(() => Boolean(supabase));
  const [menuLoadError, setMenuLoadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState(MENU_CATEGORIES[0]?.id || '');
  const storageKey = cartStorageKey(mode, seatNumber);
  const subStorageKey = subCartStorageKey(seatNumber);
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

  // 暫存等待確認的結帳參數（隊伍過長提醒用）
  const [pendingCheckout, setPendingCheckout] = useState(null);

  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [takeoutSubOrderCart, setTakeoutSubOrderCart] = useState(() => loadCart(subStorageKey));
  const [isTakingOutSub, setIsTakingOutSub] = useState(false);
  const [lastMainOrderId, setLastMainOrderId] = useState(null);
  const [queueInfo, setQueueInfo] = useState(null);

  // 目前操作的購物車：內用主單或外帶子單
  const activeCart = isTakingOutSub ? takeoutSubOrderCart : cart;
  const setActiveCart = isTakingOutSub ? setTakeoutSubOrderCart : setCart;

  // 開啟外帶子單點餐（沿用已暫存的外帶子單）
  const openTakeoutSubOrder = () => {
    setIsTakingOutSub(true);
    setIsCartOpen(false);
  };

  const categoryRefs = useRef({});
  const scrollRef = useRef(null);

  const memberRef = memberRefSuffix(auth.user);
  const effectivePickupRef = pickupRefDirty ? pickupRef : (pickupRef || memberRef);

  // 菜單更新時同步整理兩個購物車，避免留下已不存在的品項
  function applyMenu(items) {
    setMenuItems(items);
    setCart((prev) => organizeCart(prev, items));
    setTakeoutSubOrderCart((prev) => organizeCart(prev, items));
  }

  // 從 Supabase 載入菜單
  useEffect(() => {
    // 未設定 Supabase 時直接使用本機菜單，避免重複連線失敗
    if (!supabase) {
      return undefined;
    }

    let alive = true;
    let running = false;

    async function syncMenu() {
      if (running) return;

      running = true;

      try {
        const remoteMenu = await getRemoteMenu();

        if (!alive) return;

        applyMenu(remoteMenu);
        setMenuLoadError('');
      } catch (error) {
        console.error('讀取 Supabase 菜單失敗：', error);

        if (!alive) return;

        // Supabase 讀取失敗時，暫時使用本機菜單
        applyMenu(getMenu());
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

  // 主單與外帶子單分別保存，重新整理頁面不會遺失
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
    if (Object.keys(cart).length) {
      localStorage.setItem(cartTimeKey(storageKey), String(Date.now()));
    }
  }, [storageKey, cart]);

  useEffect(() => {
    localStorage.setItem(subStorageKey, JSON.stringify(takeoutSubOrderCart));
    if (Object.keys(takeoutSubOrderCart).length) {
      localStorage.setItem(cartTimeKey(subStorageKey), String(Date.now()));
    }
  }, [subStorageKey, takeoutSubOrderCart]);

  // 開啟購物車、外帶子單或訂單記錄時，查詢前方訂單（內用＋外帶）
  useEffect(() => {
    if (!isCartOpen && !isTakingOutSub && !isStatusOpen) return undefined;
    let alive = true;
    const load = () => getQueueAhead()
      .then((queue) => { if (alive) setQueueInfo(queue); })
      .catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isCartOpen, isTakingOutSub, isStatusOpen]);

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

  // 取餐排程會隨隊伍自動更新（每 30 秒），內用與外帶共用同一份預估時間。
  useEffect(() => {
    let alive = true;
    let running = false;

    async function load({ silent = true } = {}) {
      if (running || document.hidden) return;
      running = true;
      if (!silent) setScheduleLoading(true);
      try {
        const schedule = await fetchPickupSchedule();
        if (!alive) return;
        setAvailableSlots(schedule.slots || []);
        setEstimatedReadyAt(schedule.estimatedReadyAt || null);
        if (schedule.queueCount != null) {
          setQueueInfo({
            count: schedule.queueCount,
            estimatedMinutes: schedule.estimatedMinutes,
            takeoutCount: schedule.takeoutCount,
            dineInCount: schedule.dineInCount,
          });
        }
        setScheduleError('');
      } catch (error) {
        if (alive) setScheduleError(error.message);
      } finally {
        running = false;
        if (alive) setScheduleLoading(false);
      }
    }

    load({ silent: false });
    const timer = setInterval(() => load(), 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // 每次開啟購物車時立即重新計算預估時間（不用等輪詢）
  useEffect(() => {
    if (!isCartOpen && !isTakingOutSub) return undefined;
    let alive = true;
    fetchPickupSchedule()
      .then((schedule) => {
        if (!alive) return;
        setAvailableSlots(schedule.slots || []);
        setEstimatedReadyAt(schedule.estimatedReadyAt || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [isCartOpen, isTakingOutSub]);

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
    setActiveCart(prev => ({
      ...prev,
      [itemId]: Math.min(99, (prev[itemId] || 0) + 1)
    }));
  };

  const handleDecrease = (itemId) => {
    setActiveCart(prev => {
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
    setActiveCart(prev => {
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
  const cartEntries = Object.entries(activeCart).filter(([id]) =>
    menuItems.some(item => item.id === Number(id))
  );
  const totalCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const totalPrice = cartEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  // 內用主單與外帶子單各自的金額，結帳時需要分開顯示
  const mainEntries = Object.entries(cart).filter(([id]) =>
    menuItems.some(item => item.id === Number(id))
  );
  const mainCount = mainEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const mainTotal = mainEntries.reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const subEntries = Object.entries(takeoutSubOrderCart).filter(([id]) =>
    menuItems.some(item => item.id === Number(id))
  );
  const subCount = subEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const subTotal = subEntries.reduce((sum, [id, qty]) => {
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
    const next = await customerOrders(seatNumber, isTakeout ? effectivePickupRef.trim() : undefined);
    setMyOrders(next);
    // 前方訂單數不含自己的訂單（內用與外帶一起算）
    setQueueInfo(await getQueueAhead({ excludeIds: next.map(order => order.orderId) }));
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

  // 建立符合新 model 的訂單物件
  const buildOrder = ({ items, orderMode, pickupTypeValue, pickupTimeValue, parentOrderId = null }) => {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const orderItems = items.map(([id, qty]) => {
      const item = menuItems.find(i => i.id === Number(id));
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        qty,
        subtotal: item.price * qty,
      };
    });
    const isTakeoutOrder = orderMode === ORDER_MODE.TAKEOUT;
    return {
      orderId: `ORD-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5)}`,
      mode: orderMode,
      orderType: isTakeoutOrder ? 'takeout' : 'dine-in',
      tableId: isTakeoutOrder ? null : tableId,
      // 外帶子單記錄來源內用桌，方便顧客在訂單頁一起看到兩筆
      ownerSeat: isTakeoutOrder ? seatNumber : null,
      parentOrderId,
      seat: isTakeoutOrder ? TAKEOUT_SEAT : seatNumber,
      pickupType: pickupTypeValue,
      pickupRef: isTakeoutOrder ? effectivePickupRef.trim() : '',
      pickupTime: pickupTimeValue,
      estimatedReadyAt,
      createdDate: dateKey,
      items: orderItems,
      totalPrice: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
      status: 'pending',
      refundStatus: 'NOT_REQUIRED',
      queueNumber: null,
      createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  };

  // 結帳：送出前重新向後端確認時段仍有效，再建立訂單。
  const handleCheckout = async ({ pickupType: selectedType, skipQueueCheck = false, combine = false } = {}) => {
    if (totalCount === 0 || checkoutBusy) return;

    const checkoutMode = isTakingOutSub ? ORDER_MODE.TAKEOUT : mode;
    const canCombine = checkoutMode === ORDER_MODE.DINE_IN && subCount > 0;
    let shouldCombine = combine;

    // 內用主單 + 外帶子單同時存在時，詢問一起或分開結帳
    if (canCombine && !skipQueueCheck) {
      shouldCombine = window.confirm(
        `外帶子單還有 ${subCount} 項（NT$ ${subTotal}）。\n\n按「確定」：內用主單與外帶子單一起送出。\n按「取消」：只結內用主單，外帶子單稍後分開結帳。`,
      );
    }

    setCheckoutBusy(true);
    setOrderError('');

    if (!skipQueueCheck) {
      try {
        // 先確認目前製作中的訂單數量
        const activeCount = await getActiveOrderCount();

        if (activeCount >= 10) {
          setPendingCheckout({ pickupType: selectedType, combine: shouldCombine });
          setIsQueueWarningOpen(true);
          setCheckoutBusy(false);
          return;
        }
      } catch (error) {
        setOrderError(`檢查隊伍狀態失敗：${error.message}`);
        setCheckoutBusy(false);
        return;
      }
    }

    let schedule;
    try {
      schedule = await fetchPickupSchedule();
    } catch (error) {
      setOrderError(`無法確認取餐時段：${error.message}。請稍後再試。`);
      setCheckoutBusy(false);
      return;
    }
    setAvailableSlots(schedule.slots || []);
    setEstimatedReadyAt(schedule.estimatedReadyAt || null);

    const scheduled = checkoutMode === ORDER_MODE.TAKEOUT && selectedType === 'SCHEDULED';
    let finalPickupTime = schedule.estimatedReadyAt;
    if (scheduled) {
      const slot = (schedule.slots || []).find(item => item.time === pickupTime);
      if (!slot || slot.remaining <= 0) {
        setOrderError('該時段已滿，請改選');
        setPickupTime(null);
        setCheckoutBusy(false);
        return;
      }
      finalPickupTime = slot.time;
    }

    try {
      const submitted = await placeOrder(buildOrder({
        items: cartEntries,
        orderMode: checkoutMode,
        pickupTypeValue: scheduled ? 'scheduled' : 'asap',
        pickupTimeValue: finalPickupTime,
        // 分開結帳時，外帶子單仍可回溯到本次內用主單
        parentOrderId: isTakingOutSub ? lastMainOrderId : null,
      }));

      if (submitted.recoveredPrevious) {
        alert(`已確認前次訂單！\n取餐方式：${orderTypeLabel(submitted.orderType)}\n${submitted.pickupRef ? `取餐識別：${submitted.pickupRef}\n` : ''}預定取餐：約 ${submitted.pickupTime}\n總金額：$${submitted.totalPrice}\n目前購物車尚未送出，請再次確認送出。`);
        setCheckoutBusy(false);
        return;
      }

      // 一起結帳：外帶子單獨立成一筆，並指向內用主單
      let submittedSub = null;
      if (shouldCombine && subCount > 0) {
        submittedSub = await placeOrder(buildOrder({
          items: subEntries,
          orderMode: ORDER_MODE.TAKEOUT,
          pickupTypeValue: 'asap',
          pickupTimeValue: schedule.estimatedReadyAt,
          parentOrderId: submitted.orderId,
        }));
      }

      // API 確認成功後才重置，送出失敗時顧客的購物車會完整保留。
      // 主單（內用或純外帶）一定清空；外帶子單只有在本次一起送出時才清空。
      if (!isTakingOutSub) setCart({});
      if (isTakingOutSub || (shouldCombine && subCount > 0)) setTakeoutSubOrderCart({});

      // 取餐表單狀態一併歸零，回到菜單時每個品項都是 0 份
      setPickupType('ASAP');
      setPickupTime(null);
      setPickupRef('');
      setPickupRefDirty(false);
      setOrderError('');
      setPendingCheckout(null);
      setIsQueueWarningOpen(false);
      setQueueInfo(null);
      setLastMainOrderId(checkoutMode === ORDER_MODE.DINE_IN ? submitted.orderId : lastMainOrderId);

      setIsCartOpen(false);
      setIsTakingOutSub(false);
      setPlacedOrder({ ...submitted, subOrder: submittedSub });
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
    } finally {
      setCheckoutBusy(false);
    }
  };

  // 顧客確認仍要送出
  const handleConfirmQueueOrder = () => {
    const options = pendingCheckout || {};
    setIsQueueWarningOpen(false);
    setPendingCheckout(null);
    // skipQueueCheck：已提醒過隊伍過長，不再重複檢查
    handleCheckout({ ...options, skipQueueCheck: true });
  };

  // 顧客選擇返回
  const handleBackFromQueueWarning = () => {
    setIsQueueWarningOpen(false);
    setPendingCheckout(null);
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
          <span className={`menu-mode-tag ${isTakeout || isTakingOutSub ? 'takeout' : 'dine-in'}`}>
            {isTakingOutSub ? '🥡 外帶子單' : (isTakeout ? '🥡 外帶' : '🍽️ 內用')}
          </span>
          <span className="menu-seat-tag">
            {isTakingOutSub
              ? '與內用主單分開結帳'
              : (isTakeout ? (effectivePickupRef.trim() || '外帶') : `桌號：${seatNumber}`)}
          </span>
          {!isTakeout && !isTakingOutSub && (
            <button className="menu-status-check-btn" onClick={openTakeoutSubOrder}>
              🥡 加點外帶
            </button>
          )}
          {isTakingOutSub && (
            <button className="menu-status-check-btn" onClick={() => setIsTakingOutSub(false)}>
              ← 回內用
            </button>
          )}
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
        {menuLoadError && (
          <p className="menu-empty-message" role="alert">{menuLoadError}</p>
        )}
        {menuItems.length === 0 ? (
          <p className="menu-empty-message">{menuLoading ? '菜單載入中…' : '目前沒有可點的餐點。'}</p>
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
                    const qty = activeCart[item.id] || 0;
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
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. 底部購物車預覽列 */}
      {totalCount > 0 && (
        <div className="menu-footer-bar" onClick={() => setIsCartOpen(true)}>
          <div className="menu-cart-info">
            <span>{isTakingOutSub ? '外帶子單已選' : '已選'} <b>{totalCount}</b> 項</span>
            <span className="menu-total-price">總計 ${totalPrice}</span>
          </div>
          <button className="menu-checkout-btn">
            查看購物車 ➔
          </button>
        </div>
      )}

      {/* 內用時若已建立外帶子單，固定顯示切換入口 */}
      {!isTakeout && !isTakingOutSub && subCount > 0 && (
        <div className="menu-sub-order-bar">
          <span>🥡 外帶子單 {subCount} 項 · NT$ {subTotal}</span>
          <button onClick={openTakeoutSubOrder}>切換填寫</button>
        </div>
      )}

      {/* 5. 購物車彈窗 */}
      <CartModal 
        key={isCartOpen ? 'cart-open' : 'cart-closed'}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={activeCart}
        menuItems={menuItems}
        seatNumber={seatNumber}
        orderType={isTakingOutSub ? ORDER_TYPE.TAKEOUT : orderType}
        mode={isTakingOutSub ? ORDER_MODE.TAKEOUT : mode}
        isSubOrder={isTakingOutSub}
        mainSummary={!isTakingOutSub && !isTakeout ? { count: mainCount, total: mainTotal } : null}
        subSummary={!isTakingOutSub && !isTakeout && subCount > 0 ? { count: subCount, total: subTotal } : null}
        queue={queueInfo}
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
              {normalizeOrderType(placedOrder.orderType) === ORDER_TYPE.TAKEOUT ? (
                <>
                  {placedOrder.pickupRef && (
                    <div><dt>取餐識別</dt><dd>{placedOrder.pickupRef}</dd></div>
                  )}
                  <div>
                    <dt>{placedOrder.pickupType === 'scheduled' ? '預定取餐' : '盡快取餐'}</dt>
                    <dd>約 {placedOrder.pickupTime}</dd>
                  </div>
                </>
              ) : (
                <div><dt>桌號</dt><dd>{placedOrder.tableId || placedOrder.seat}</dd></div>
              )}
              <div><dt>總金額</dt><dd className="order-success-price">${placedOrder.totalPrice}</dd></div>
              <div><dt>訂單編號</dt><dd>#{placedOrder.orderId}</dd></div>
            </dl>

            {placedOrder.subOrder && (
              <div className="order-success-suborder">
                <h4>🥡 外帶子單</h4>
                <dl className="order-success-list">
                  <div><dt>取餐識別</dt><dd>{placedOrder.subOrder.pickupRef || '未填'}</dd></div>
                  <div><dt>取餐方式</dt><dd>盡快取餐（約 {placedOrder.subOrder.pickupTime}）</dd></div>
                  <div><dt>總金額</dt><dd>${placedOrder.subOrder.totalPrice}</dd></div>
                  <div><dt>訂單編號</dt><dd>#{placedOrder.subOrder.orderId}</dd></div>
                </dl>
              </div>
            )}
            {!placedOrder.subOrder && subCount > 0 && (
              <p className="order-success-note">
                🥡 外帶子單尚未送出，請關閉後按「加點外帶」完成結帳。
              </p>
            )}

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
                          : `桌號：${order.tableId || order.seat}`}
                      </span>
                      {order.parentOrderId && (
                        <span className="order-status-parent">外帶子單 · 主單 #{order.parentOrderId}</span>
                      )}
                    </div>

                    {/* 叫號顯示：外帶取餐序號在接單後才產生 */}
                    <div className="order-callout">
                      {normalizeOrderType(order.orderType) === ORDER_TYPE.TAKEOUT && order.pickupNo
                        ? `取餐序號 ${order.pickupNo}${order.pickupRef ? ` · ${order.pickupRef}` : ''}`
                        : `#${order.orderId}${order.pickupRef ? ` · ${order.pickupRef}` : ''}`}
                    </div>

                    {/* 精簡狀態顯示 */}
                    <div className="order-status-state">
                      {order.status === 'pending' && <span className="state-pending">⏳ 等待接單中</span>}
                      {(order.status === 'accepted' || order.status === 'making') && (
                        <span className="state-accepted">🍳 製作中</span>
                      )}
                      {(order.status === 'completed' || order.status === 'done') && (
                        <span className="state-completed">✅ 餐點已完成請取餐</span>
                      )}
                      {(order.status === 'completed' || order.status === 'done') && supabase && (
                        <button className="menu-status-check-btn" onClick={() => navigate(`/customer/reviews?seat=${encodeURIComponent(seatParam)}&type=${orderType}`)}>★ 登入並評論這次用餐</button>
                      )}
                      {order.status === 'rejected' && <span className="state-rejected">❌ 已被婉拒</span>}
                    </div>

                    {(order.status === 'pending' || order.status === 'accepted' || order.status === 'making')
                      && queueInfo && (
                        <div className="order-status-queue">
                          前方還有 <b>{queueInfo.count}</b> 筆訂單
                          （內用 {queueInfo.dineInCount ?? 0} · 外帶 {queueInfo.takeoutCount ?? 0}，
                          預估約 {queueInfo.estimatedMinutes} 分鐘）
                        </div>
                      )}

                    <div className="order-status-pickup">
                      {order.orderType === 'takeout'
                        ? `${order.pickupType === 'scheduled' ? '預定取餐' : '盡快取餐'}：`
                        : '預估完成：'}
                      <b>約 {order.pickupTime}</b>
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
                      <span className="order-status-model">狀態：{statusLabel(order.status)}</span>
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