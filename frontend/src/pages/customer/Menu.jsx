import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMenu, MENU_CATEGORIES } from '../../data/menuData';
import CartModal from './CartModal';
import { customerOrders, placeOrder } from '../../data/orderService';
import { supabase } from '../../lib/supabase';
import './css/Menu.css';

export default function Menu() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seatNumber = searchParams.get('seat') || "A-01";

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [orderError, setOrderError] = useState('');

  const categoryRefs = useRef({});

  useEffect(() => {
    // 頁面開啟時先讀取最新菜單
    function syncMenu() {
      setMenuItems(getMenu());
    }

    syncMenu();

    // 當其他分頁修改菜單時，自動更新
    window.addEventListener('storage', syncMenu);

    return () => {
      window.removeEventListener('storage', syncMenu);
    };
  }, []);

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

  const handleScrollToCategory = (catId) => {
    const element = categoryRefs.current[catId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(i => i.id === Number(id));
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handleOpenStatus = async () => {
    setIsStatusOpen(true);
    setOrderError('');
    try { setMyOrders(await customerOrders(seatNumber)); }
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
        const next = await customerOrders(seatNumber);
        if (alive) { setMyOrders(next); setOrderError(''); }
      } catch (error) { if (alive) setOrderError(error.message); }
      finally { running = false; }
    },5000);
    return () => { alive = false; clearInterval(timer); };
  }, [isStatusOpen, seatNumber]);

  // 結帳（僅保留取餐時間與基本資訊）
  const handleCheckout = async (pickupTime) => {
    if (totalCount === 0 || checkoutBusy) return;
    setCheckoutBusy(true);
    setOrderError('');
    try {

    const orderItems = Object.entries(cart).map(([id, qty]) => {
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
      seat: seatNumber,
      createdDate: (() => {        // 記錄顧客下單的日期
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      items: orderItems,
      totalPrice: totalPrice,
      pickupTime: pickupTime,
      status: 'pending', // pending / accepted / completed / rejected
      queueNumber: null,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const submitted = await placeOrder(newOrder);

    if (submitted.recoveredPrevious) {
      alert(`已確認前次訂單！\n桌號：${submitted.seat}\n預定取餐：${submitted.pickupTime}\n總金額：$${submitted.totalPrice}\n目前購物車尚未送出，請再次確認送出。`);
      return;
    }

    alert(`🎉 訂單已送出！\n桌號：${submitted.seat}\n預定取餐：${submitted.pickupTime}\n總金額：$${submitted.totalPrice}`);
    
    setCart({});
    setIsCartOpen(false);
    } catch (error) { setOrderError(`送出失敗：${error.message}。請重試，重試會安全地確認前次訂單。`); }
    finally { setCheckoutBusy(false); }
  };

  return (
    <div className="menu-container">
      
      {/* 1. 頂部導覽列 */}
      <div className="menu-header">
        <span className="menu-title-text">線上點餐系統</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="menu-status-check-btn" onClick={() => navigate(`/customer/reviews?seat=${encodeURIComponent(seatNumber)}`)}>★ 評價</button>
          <span className="menu-seat-tag">桌號：{seatNumber}</span>
          <button className="menu-status-check-btn" onClick={handleOpenStatus}>
            📋 訂單記錄
          </button>
        </div>
      </div>

      {/* 2. 橫向分類標籤列 */}
      <div className="menu-tabs-horizontal">
        {MENU_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="menu-tab-chip"
            onClick={() => handleScrollToCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 3. 菜單列表區 */}
      <div className="menu-scroll-area">
        {MENU_CATEGORIES.map(cat => {
          const itemsInCat = menuItems.filter(item => item.category === cat.id && item.available !== false);
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
                            <button className="menu-plus-btn" onClick={() => handleIncrease(item.id)}>
                              +
                            </button>
                          ) : (
                            <div className="menu-counter-control">
                              <button className="counter-btn" onClick={() => handleDecrease(item.id)}>-</button>
                              <span className="counter-num">{qty}</span>
                              <button className="counter-btn" onClick={() => handleIncrease(item.id)}>+</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <img src={item.image} alt={item.name} className="menu-item-image" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        menuItems={menuItems}
        seatNumber={seatNumber}
        onIncrease={handleIncrease}
        onDecrease={handleDecrease}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        busy={checkoutBusy}
        error={orderError}
      />

      {/* 6. 精簡後的「我的訂單」狀態面板 */}
      {isStatusOpen && (
        <div className="cart-modal-overlay" onClick={() => setIsStatusOpen(false)}>
          <div className="cart-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h3>📋 訂單狀態</h3>
              <button className="cart-close-btn" onClick={() => setIsStatusOpen(false)}>✕</button>
            </div>

            <div className="cart-items-list" style={{ gap: '12px' }}>
              {orderError && <p role="alert" style={{ color: '#b91c1c' }}>{orderError}</p>}
              {myOrders.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>目前沒有訂單紀錄</p>
              ) : (
                myOrders.map(order => (
                  <div key={order.orderId} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>
                      <span>編號: {order.orderId}</span>
                      <span>{order.createdAt}</span>
                    </div>

                    {/* 精簡狀態顯示 */}
                    <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                      {order.status === 'pending' && <span style={{ color: '#d97706', fontWeight: 'bold' }}>⏳ 等待接單中</span>}
                      {order.status === 'accepted' && <span style={{ color: '#2563eb', fontWeight: 'bold' }}>🍳 製作中 {order.queueNumber && `(序號 #${order.queueNumber})`}</span>}
                      {order.status === 'completed' && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✅ 餐點已完成請取餐</span>}
                      {order.status === 'completed' && supabase && <button className="menu-status-check-btn" onClick={() => navigate(`/customer/reviews?seat=${encodeURIComponent(seatNumber)}`)}>★ 登入並評論這次用餐</button>}
                      {order.status === 'rejected' && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>❌ 已被婉拒</span>}
                    </div>

                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                      取餐時間：<b>{order.pickupTime}</b>
                    </div>

                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {order.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                          <span>{it.name} x {it.qty}</span>
                          <span>${it.subtotal}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '6px', fontWeight: 'bold', color: '#ea580c', fontSize: '14px' }}>
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
