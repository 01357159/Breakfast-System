import {
  getMenu,
  saveMenu,
  MENU_CATEGORIES,
} from '../../data/menuData';
import { useEffect, useState } from 'react';
import './css/OwnerApp.css';
import { useAuth } from '../../auth/authContext';
import AuthControls from '../../auth/AuthControls';
import ReviewBoard from '../../reviews/ReviewBoard';
import { ownerOrders, setOrderStatus, readLocalOrders } from '../../data/orderService';
import { supabase } from '../../lib/supabase';

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function OwnerApp() {
  const auth = useAuth();
  if (auth.configured && (auth.loading || !auth.user || !auth.isOwner || auth.error)) {
    return <main className="review-owner-gate"><h1>早餐店老闆後台</h1>
      <p>{auth.loading ? '正在確認店家權限…' : auth.user ? '此帳號尚未取得店家權限，請聯絡管理員。' : '請使用授權的店家 Google 帳號登入。'}</p>
      <AuthControls owner />
    </main>;
  }
  return <OwnerDashboard key={auth.user?.id || 'local'} />;
}

function OwnerDashboard() {
  const auth = useAuth();
  // orders 是目前畫面使用的訂單資料
  // setOrders 是更新訂單資料的方法
  const [orders, setOrders] = useState(() => supabase ? [] : readLocalOrders());
  const [orderError, setOrderError] = useState('');
  const [busyOrder, setBusyOrder] = useState(null);

  // 目前的菜單資料
  const [menuItems, setMenuItems] = useState(getMenu);

  // 表單中的餐點資料
  const [form, setForm] = useState({
    name: '',
    category: 'omelet',
    price: '',
    description: '',
    image: '',
  });

  // 正在編輯哪一個餐點
  // null 表示目前是新增模式
  const [editingId, setEditingId] = useState(null);

  // 顯示操作結果
  const [menuMessage, setMenuMessage] = useState('');

  // 預設顯示訂單管理
  const [activeTab, setActiveTab] = useState('orders');

  // 取得今天的日期
  const today = getTodayDateKey();

  // 只留下今天建立的訂單
  const todayOrders = orders.filter(
    (order) => order.createdDate === today
  );

  // 計算今天已完成的訂單
  const completedOrders = todayOrders.filter(
    (order) => order.status === 'completed'
  );

  // 計算今日營收
  const todayRevenue = completedOrders.reduce(
    (total, order) => total + Number(order.totalPrice || 0),
    0
  );  

  // 計算今日完成訂單數
  const completedCount = completedOrders.length;

  useEffect(() => {
    // 當其他分頁更新訂單時，自動重新讀取
    let alive = true;
    let running = false;
    async function syncOrders() {
      if (running) return;
      running = true;
      try {
        const next = await ownerOrders();
        if (alive) { setOrders(next); setOrderError(''); }
      } catch (error) { if (alive) setOrderError(error.message); }
      finally { running = false; }
    }
    syncOrders();

    // 監聽同一網站來源的其他分頁
    window.addEventListener('storage', syncOrders);

    // 每五秒同步一次，包含其他裝置送出的訂單
    const timer = setInterval(syncOrders, 5000);

    // 元件離開時，清除監聽器與計時器
    return () => {
      alive = false;
      window.removeEventListener('storage', syncOrders);
      clearInterval(timer);
    };
  }, []);

  // 更新訂單狀態，並儲存回瀏覽器
  async function refreshOrders() {
    try { setOrders(await ownerOrders()); setOrderError(''); }
    catch (error) { setOrderError(error.message); }
  }
  async function updateStatus(orderId, newStatus) {
    setBusyOrder(orderId); setOrderError('');
    try { await setOrderStatus(orderId,newStatus); await refreshOrders(); }
    catch (error) { setOrderError(error.message); }
    finally { setBusyOrder(null); }
  }

  const statusNames = {
    pending: '等待接單',
    accepted: '製作中',
    completed: '已完成',
    rejected: '已婉拒',
  };

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // 清空表單，切換回新增模式
  function resetForm() {
    setForm({
      name: '',
      category: 'omelet',
      price: '',
      description: '',
      image: '',
    });

    setEditingId(null);
  }

  // 新增餐點或修改餐點
  function handleSaveMenu(event) {
    event.preventDefault();

    const name = form.name.trim();
    const price = Number(form.price);

    if (!name) {
      setMenuMessage('請輸入餐點名稱');
      return;
    }

    if (form.price === '' || !Number.isFinite(price) || price < 0) {
      setMenuMessage('請輸入有效的餐點價格');
      return;
    }

    let updatedMenu;

    if (editingId !== null) {
      // 修改現有餐點
      updatedMenu = menuItems.map((item) =>
        item.id === editingId
          ? {
              ...item,
              name,
              category: form.category,
              price,
              description: form.description.trim(),
              image: form.image.trim() || item.image,
            }
          : item
      );
    } else {
      // 新增餐點
      const newItem = {
        id: Date.now(),
        name,
        category: form.category,
        price,
        description: form.description.trim(),
        image: form.image.trim() || 'https://placehold.co/150',
        available: true,
      };

      updatedMenu = [...menuItems, newItem];
    }

    saveMenu(updatedMenu);
    setMenuItems(updatedMenu);
    resetForm();
    setMenuMessage(
      editingId === null ? '餐點新增成功！' : '餐點修改成功！'
    );
  }

  // 將現有餐點載入表單
  function handleEditMenu(item) {
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description || '',
      image: item.image || '',
    });

    setEditingId(item.id);
    setMenuMessage('');
  }

  // 切換餐點上架或下架
  function handleToggleMenu(itemId) {
    const updatedMenu = menuItems.map((item) =>
      item.id === itemId
        ? { ...item, available: item.available === false }
        : item
    );

    saveMenu(updatedMenu);
    setMenuItems(updatedMenu);
    setMenuMessage('餐點供應狀態已更新');
  }

  return (
    <main className="owner-page">
      <header className="owner-header">
        <h1>早餐店老闆後台</h1>
        <p>即時訂單及餐點管理</p>
        {auth.configured && <AuthControls owner />}
      </header>

      <nav className="owner-tabs">
        <button
          type="button"
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}
        >
          📋 訂單管理
        </button>

        <button
          type="button"
          className={activeTab === 'menu' ? 'active' : ''}
          onClick={() => setActiveTab('menu')}
        >
          🍳 餐點管理
        </button>
        <button type="button" className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>★ 顧客評論</button>
      </nav>

      {activeTab === 'reviews' && <section className="owner-panel"><ReviewBoard owner /></section>}
      {orderError && <p role="alert" className="review-error">{orderError}</p>}

      
      {/* 菜單管理 */}
      {activeTab === 'menu' && (
        <section className="owner-panel menu-admin">
          <h2>🍳 菜單管理</h2>

          <form className="menu-form" onSubmit={handleSaveMenu}>
            <label>
              餐點名稱
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="例如：鮪魚蛋餅"
                required
              />
            </label>

            <label>
              餐點分類
              <select
                value={form.category}
                onChange={(e) => updateForm('category', e.target.value)}
              >
                {MENU_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              價格（元）
              <input
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => updateForm('price', e.target.value)}
                placeholder="例如：45"
                required
              />
            </label>

            <label>
              餐點描述
              <input
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="例如：香酥蛋餅搭配鮮嫩鮪魚"
              />
            </label>

            <label>
              圖片網址（選填）
              <input
                type="url"
                value={form.image}
                onChange={(e) => updateForm('image', e.target.value)}
                placeholder="https://..."
              />
            </label>

            <div className="menu-form-actions">
              <button type="submit">
                {editingId !== null ? '儲存修改' : '新增餐點'}
              </button>

              {editingId !== null && (
                <button type="button" onClick={resetForm}>
                  取消修改
                </button>
              )}
            </div>

            {menuMessage && (
              <p className="menu-message" role="status">
                {menuMessage}
              </p>
            )}
          </form>

          <h3>現有餐點（{menuItems.length} 項）</h3>

            <div className="menu-admin-list">
              {menuItems.map((item) => (
                <article className="menu-admin-item" key={item.id}>
                  <div className="menu-admin-info">
                    <strong>{item.name}</strong>
                    <span>NT$ {item.price}</span>
                    <span>
                      {item.available === false ? '目前已下架' : '供應中'}
                    </span>
                  </div>

                <div className="menu-admin-actions">
                  <button
                    type="button"
                    onClick={() => handleEditMenu(item)}
                  >
                    編輯
                  </button>

                  <button
                     type="button"
                     onClick={() => handleToggleMenu(item.id)}
                   >
                     {item.available === false ? '重新上架' : '下架'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="owner-stats">
        <div className="stat-card revenue-card">
           <p>今日總營收</p>
           <h2>
            NT$ {todayRevenue.toLocaleString('zh-TW')}
           </h2>
        </div>

         <div className="stat-card completed-card">
           <p>已完成訂單</p>
           <h2>{completedCount} 筆</h2>
         </div>
      </section>      
      
      {activeTab === 'orders' && (
        <section className="owner-panel">
          <div className="owner-panel-heading">
            <h2>顧客訂單</h2>
            <button onClick={refreshOrders}>
              重新讀取
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="empty-message">
              目前沒有訂單。請先到顧客端送出一筆訂單。
            </p>
          ) : (
            orders.map((order) => (
              <article className="order-card" key={order.orderId}>
                <h3>{order.orderId}</h3>

                <p>桌號：{order.seat}</p>
                <p>取餐時間：{order.pickupTime}</p>
                <p>下單時間：{order.createdAt}</p>

                <div className="order-items">
                  {order.items.map((item, index) => (
                    <p key={`${order.orderId}-${item.id}-${index}`}>
                      {item.name} × {item.qty}
                      {' — '}
                      NT${item.subtotal}
                    </p>
                  ))}
                </div>

                <p className="order-total">
                  總金額：NT${order.totalPrice}
                </p>

                <p>
                  狀態：{statusNames[order.status] || order.status}
                </p>

                <div className="order-actions">
                  {order.status === 'pending' && (
                    <>
                      <button
                        disabled={busyOrder === order.orderId}
                        onClick={() =>
                          updateStatus(order.orderId, 'accepted')
                        }
                      >
                        接受訂單
                      </button>

                      <button
                        disabled={busyOrder === order.orderId}
                        className="reject-button"
                        onClick={() =>
                          updateStatus(order.orderId, 'rejected')
                        }
                      >
                        婉拒訂單
                      </button>
                    </>
                  )}

                  {order.status === 'accepted' && (
                    <button
                      disabled={busyOrder === order.orderId}
                      onClick={() =>
                        updateStatus(order.orderId, 'completed')
                      }
                    >
                      完成訂單
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {editingId !== null && (
        <div className="menu-modal-backdrop">
          <section
            className="menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-modal-title"
          >
            <div className="menu-modal-header">
              <h2 id="menu-modal-title">編輯餐點</h2>
              <button
                type="button"
                className="menu-modal-close"
                onClick={resetForm}
                aria-label="關閉編輯視窗"
              >
                ×
              </button>
            </div>

            <form className="menu-modal-form" onSubmit={handleSaveMenu}>
              <label>
                餐點名稱
                <input
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  required
                />
              </label>

              <label>
                餐點分類
                <select
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                >
                  {MENU_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                價格（元）
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(e) => updateForm('price', e.target.value)}
                  required
                />
              </label>

              <label>
                餐點描述
                <input
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                />
              </label>

              <label>
                圖片網址
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => updateForm('image', e.target.value)}
                  placeholder="https://..."
                />
              </label>

              {menuMessage && (
                <p className="menu-message" role="alert">
                  {menuMessage}
                </p>
              )}

              <div className="menu-modal-actions">
                <button type="button" onClick={resetForm}>
                  取消
                </button>
                <button type="submit">儲存修改</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
