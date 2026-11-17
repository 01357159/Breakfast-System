import { useState } from 'react';
import './css/Order.css';

const ORDER_TABS = [
  { id: 'pending', label: '新訂單' },
  { id: 'accepted', label: '製作中' },
  { id: 'completed', label: '已完成' },
  { id: 'rejected', label: '已拒絕' },
];

export default function Order({
  orders,
  refreshOrders,
  statusNames,
  busyOrder,
  updateStatus,
}) {
  // 目前選取的訂單分頁
  const [activeOrderTab, setActiveOrderTab] = useState('pending');

  // 只顯示目前分頁的訂單，並依下單時間由舊到新排序
  const filteredOrders = orders
    .filter((order) => order.status === activeOrderTab)
    .reverse()

  // 計算各分頁的訂單數量
  function getOrderCount(status) {
    return orders.filter((order) => order.status === status).length;
  }

  return (
    <section className="owner-panel">
      <div className="owner-panel-heading">
        <h2>顧客訂單</h2>

        <button type="button" onClick={refreshOrders}>
          重新讀取
        </button>
      </div>

      {/* 訂單狀態分頁 */}
      <nav className="owner-tabs order-status-tabs">
        {ORDER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeOrderTab === tab.id ? 'active' : ''}
            onClick={() => setActiveOrderTab(tab.id)}
          >
            {tab.label}（{getOrderCount(tab.id)}）
          </button>
        ))}
      </nav>

      {/* 目前分頁的訂單 */}
      {filteredOrders.length === 0 ? (
        <p className="empty-message">
          目前沒有{ORDER_TABS.find(
            (tab) => tab.id === activeOrderTab
          )?.label}。
        </p>
      ) : (
        filteredOrders.map((order) => (
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
                    type="button"
                    disabled={busyOrder === order.orderId}
                    onClick={() =>
                      updateStatus(order.orderId, 'accepted')
                    }
                  >
                    接受訂單
                  </button>

                  <button
                    type="button"
                    disabled={busyOrder === order.orderId}
                    className="reject-button"
                    onClick={() =>
                      updateStatus(order.orderId, 'rejected')
                    }
                  >
                    拒絕訂單
                  </button>
                </>
              )}

              {order.status === 'accepted' && (
                <button
                  type="button"
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
  );
}