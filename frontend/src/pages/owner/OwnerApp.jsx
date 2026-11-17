import {
  getMenu,
  MENU_CATEGORIES,
} from '../../data/menuData';

import {
  getRemoteMenu,
  saveRemoteMenu,
  uploadMenuImage,
  deleteMenuImage,
} from '../../data/menuService';

import { useEffect, useState } from 'react';
import './css/OwnerApp.css';
import { useAuth } from '../../auth/authContext';
import AuthControls from '../../auth/AuthControls';
import ReviewBoard from '../../reviews/ReviewBoard';
import { ownerOrders, setOrderStatus, readLocalOrders } from '../../data/orderService';
import { orderTypeLabel } from '../../data/orderTypes';
import { supabase } from '../../lib/supabase';

import Dashboard from './Dashboard';
import Order from './Order';
import Menu from './Menu';
import MenuModal from './MenuModal';
import QrCodes from './QrCodes';

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
  const [orders, setOrders] = useState(() => supabase ? [] : readLocalOrders());
  const [orderError, setOrderError] = useState('');
  const [busyOrder, setBusyOrder] = useState(null);
  const [menuItems, setMenuItems] = useState(getMenu);
  const [form, setForm] = useState({
    name: '', category: 'omelet', price: '', description: '',
    image: '', imagePath: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [menuMessage, setMenuMessage] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [typeFilter, setTypeFilter] = useState('all');
  const today = getTodayDateKey();
  const todayOrders = orders.filter(
    (order) => order.createdDate === today
  );
  const completedOrders = todayOrders.filter(
    (order) => order.status === 'completed'
  );
  const todayRevenue = completedOrders.reduce(
    (total, order) => total + Number(order.totalPrice || 0), 0
  );
  const completedCount = completedOrders.length;
  // 依目前選擇的取餐方式篩選要顯示的訂單
  const visibleOrders = visibleOrdersFilter(orders, typeFilter);

  useEffect(() => {
    let alive = true;
    // 未設定 Supabase 時直接使用本機菜單（menuItems 已初始化為本機資料）
    if (!supabase) return undefined;
    async function loadMenu() {
      try {
        const remoteMenu = await getRemoteMenu();
        if (!alive) return;
        if (remoteMenu.length === 0) {
          const localMenu = getMenu();
          await saveRemoteMenu(localMenu);
          if (alive) { setMenuItems(localMenu); }
        } else {
          setMenuItems(remoteMenu);
        }
      } catch (error) {
        console.error('載入 Supabase 菜單失敗：', error);
        if (alive) { setMenuMessage(`菜單載入失敗：${error.message}`); }
      }
    }
    loadMenu();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
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
    window.addEventListener('storage', syncOrders);
    const timer = setInterval(syncOrders, 5000);
    return () => {
      alive = false;
      window.removeEventListener('storage', syncOrders);
      clearInterval(timer);
    };
  }, []);

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
    setForm((previous) => ({ ...previous, [field]: value }));
  }
  function resetForm() {
    setForm({
      name: '', category: 'omelet', price: '', description: '',
      image: '', imagePath: '',
    });
    setEditingId(null);
  }
  async function handleSaveMenu(event) {
    event.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) { setMenuMessage('請輸入餐點名稱'); return; }
    if (form.price === '' || !Number.isFinite(price) || price < 0) {
      setMenuMessage('請輸入有效的餐點價格'); return;
    }
    let uploadedImage = null;
    try {
      const currentEditingId = editingId;
      const itemId = currentEditingId ?? Date.now();
      const oldItem = menuItems.find((item) => item.id === currentEditingId);
      let image = form.image;
      let imagePath = form.imagePath || '';
      if (form.image?.startsWith('data:image/')) {
        uploadedImage = await uploadMenuImage(form.image, itemId);
        image = uploadedImage.image;
        imagePath = uploadedImage.imagePath;
      }
      if (!image) { image = 'https://placehold.co/150'; imagePath = ''; }
      let updatedMenu;
      if (currentEditingId !== null) {
        updatedMenu = menuItems.map((item) =>
          item.id === currentEditingId
            ? { ...item, name, category: form.category, price,
                description: form.description.trim(), image, imagePath }
            : item
        );
      } else {
        const newItem = {
          id: itemId, name, category: form.category, price,
          description: form.description.trim(), image, imagePath,
          available: true,
        };
        updatedMenu = [...menuItems, newItem];
      }
      await saveRemoteMenu(updatedMenu);
      setMenuItems(updatedMenu);
      if (oldItem?.imagePath && oldItem.imagePath !== imagePath) {
        try { await deleteMenuImage(oldItem.imagePath); } catch (error) {
          console.error('舊圖片刪除失敗：', error);
        }
      }
      resetForm();
      setMenuMessage(
        currentEditingId === null ? '餐點新增成功！' : '餐點修改成功！'
      );
    } catch (error) {
      if (uploadedImage?.imagePath) {
        try { await deleteMenuImage(uploadedImage.imagePath); } catch (deleteError) {
          console.error('清理新圖片失敗：', deleteError);
        }
      }
      console.error('儲存餐點失敗：', error);
      setMenuMessage(`儲存失敗：${error.message}`);
    }
  }
  function handleEditMenu(item) {
    setForm({
      name: item.name, category: item.category,
      price: String(item.price), description: item.description || '',
      image: item.image || '', imagePath: item.imagePath || '',
    });
    setEditingId(item.id);
    setMenuMessage('');
  }
  async function handleToggleMenu(itemId) {
    const updatedMenu = menuItems.map((item) =>
      item.id === itemId ? { ...item, available: item.available === false } : item
    );
    try {
      await saveRemoteMenu(updatedMenu);
      setMenuItems(updatedMenu);
      setMenuMessage('餐點供應狀態已更新');
    } catch (error) {
      console.error('更新餐點狀態失敗：', error);
      setMenuMessage(`更新失敗：${error.message}`);
    }
  }
  return (
    <main className="owner-page">
      <header className="owner-header">
        <h1>早餐店老闆後台</h1>
        <p>即時訂單及餐點管理</p>
        {auth.configured && <AuthControls owner />}
      </header>
      <nav className="owner-tabs">
        <button type="button" className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}>📋 訂單管理</button>
        <button type="button" className={activeTab === 'menu' ? 'active' : ''}
          onClick={() => setActiveTab('menu')}>🍳 餐點管理</button>
        <button type="button" className={activeTab === 'reviews' ? 'active' : ''}
          onClick={() => setActiveTab('reviews')}>★ 顧客評論</button>
        <button type="button" className={activeTab === 'qrcodes' ? 'active' : ''}
          onClick={() => setActiveTab('qrcodes')}>🔗 QR Code</button>
      </nav>
      {activeTab === 'qrcodes' && <QrCodes />}
      {activeTab === 'reviews' && <section className="owner-panel"><ReviewBoard owner /></section>}
      {orderError && <p role="alert" className="review-error">{orderError}</p>}
      {activeTab === 'menu' && (
        <Menu menuItems={menuItems} form={form} editingId={editingId}
          menuMessage={menuMessage} categories={MENU_CATEGORIES}
          updateForm={updateForm} handleSaveMenu={handleSaveMenu}
          resetForm={resetForm} handleEditMenu={handleEditMenu}
          handleToggleMenu={handleToggleMenu} />
      )}
      <Dashboard todayRevenue={todayRevenue} completedCount={completedCount} />
      {activeTab === 'orders' && (
        <>
          <section className="owner-panel">
            <div className="owner-panel-heading">
              <h2>顧客訂單</h2>
              <button onClick={refreshOrders}>重新讀取</button>
            </div>
            <div className="owner-order-filters" role="group" aria-label="依取餐方式篩選">
              {
                [
                  { id: 'all', label: '全部' },
                  { id: 'dine-in', label: '🍽️ 內用' },
                  { id: 'takeout', label: '🥡 外帶' },
                ].map(filter => (
                  <button key={filter.id} type="button"
                    className={typeFilter === filter.id ? 'active' : ''}
                    onClick={() => setTypeFilter(filter.id)}>{filter.label}</button>
                ))
              }
            </div>
            {orders.length === 0 ? (
              <p className="empty-message">目前沒有訂單。請先到顧客端送出一筆訂單。</p>
            ) : visibleOrders.length === 0 ? (
              <p className="empty-message">
                目前沒有{typeFilter === 'takeout' ? '外帶' : '內用'}訂單。
              </p>
            ) : (visibleOrders.map((order) => (
              <article className="order-card" key={order.orderId}>
                <div className="order-card-heading">
                  <h3>{order.orderId}</h3>
                  <span className={`order-type-badge ${normalizeOrderType(order.orderType)}`}>
                    {orderTypeLabel(order.orderType)}
                  </span>
                  {order.parentOrderId && (
                    <span className="order-parent-badge">外帶子單 · 主單 #{order.parentOrderId}</span>
                  )}
                </div>
                {normalizeOrderType(order.orderType) === 'takeout' ? (
                  <p>取餐識別：<b>{order.pickupRef || '未填寫'}</b>
                    {order.pickupNo && <span className="order-pickup-no">取餐序號 {order.pickupNo}</span>}
                  </p>
                ) : (
                  <p>桌號：{order.tableId || order.seat}</p>
                )}
                <div className="order-callout">
                  {normalizeOrderType(order.orderType) === 'takeout' && order.pickupNo
                    ? `取餐序號 ${order.pickupNo}${order.pickupRef ? ` · ${order.pickupRef}` : ''}`
                    : `#${order.orderId}${order.pickupRef ? ` · ${order.pickupRef}` : ''}`}
                </div>
                {normalizeOrderType(order.orderType) === 'takeout' && (
                  <p>
                    {order.pickupType === 'scheduled' ? '預定取餐' : '盡快取餐'}：約 {order.pickupTime}
                  </p>
                )}
                <p>下單時間：{order.createdAt}</p>
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <p key={`${order.orderId}-${item.id}-${index}`}>
                      {item.name} × {item.qty}
                      {' — '}
                      NT$ {item.subtotal}
                    </p>
                  ))}
                </div>
                <p className="order-total">總金額：NT$ {order.totalPrice}</p>
                <p>狀態：{statusNames[order.status] || order.status}</p>
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <>
                      <button disabled={busyOrder === order.orderId}
                        onClick={() => updateStatus(order.orderId, 'accepted')}>
                        接受訂單
                      </button>
                      <button disabled={busyOrder === order.orderId}
                        className="reject-button" onClick={() =>
                          updateStatus(order.orderId, 'rejected')
                        }>婉拒訂單</button>
                    </>
                  )}
                  {(order.status === 'accepted' || order.status === 'making') && (
                    <button disabled={busyOrder === order.orderId}
                      onClick={() => updateStatus(order.orderId, 'completed')}>
                      完成訂單
                    </button>
                  )}
                </div>
              </article>
            )))}
          </section>
          <Order orders={orders} refreshOrders={refreshOrders}
            statusNames={statusNames} busyOrder={busyOrder}
            updateStatus={updateStatus} />
        </>
      )}
      {editingId !== null && (
        <MenuModal form={form} categories={MENU_CATEGORIES}
          menuMessage={menuMessage} updateForm={updateForm}
          resetForm={resetForm} />
      )}
    </main>
  );
}
function visibleOrdersFilter(orders, typeFilter) {
  if (typeFilter === 'all') return orders;
  return orders.filter(order => normalizeOrderType(order.orderType) === typeFilter);
}
function normalizeOrderType(orderType) {
  if (orderType === 'dine-in' || orderType === 'dine_in') return 'dine-in';
  if (orderType === 'takeout' || orderType === 'take_out') return 'takeout';
  return orderType;
}