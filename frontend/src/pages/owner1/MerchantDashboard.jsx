import React, { useState } from 'react';
import './css/MerchantDashboard.css';

export default function MerchantDashboard() {
  // 模擬從顧客端接收到的即時訂單資料
  const [orders, setOrders] = useState([
    {
      orderId: 'A01',
      customerName: '林同學',
      items: [
        { name: '經典培根蛋餅', quantity: 1, options: { ice: '無', ketchup: '不要' } },
        { name: '大冰奶', quantity: 1, options: { ice: '去冰' } }
      ],
      total: 85,
      pickupTime: '08:30',
      status: 'pending', // pending: 待審核, processing: 製作中, completed: 已完成, rejected: 已拒絕
      serialNumber: null  // 接單後自動產生
    },
    {
      orderId: 'A02',
      customerName: '王小姐',
      items: [
        { name: '原味蛋餅', quantity: 2, options: {} },
        { name: '美式咖啡', quantity: 1, options: { sweetness: '半糖' } }
      ],
      total: 110,
      pickupTime: '08:40',
      status: 'pending',
      serialNumber: null
    }
  ]);

  // 計數器，用來產生每日流水號 (例如 #1, #2...)
  const [serialCounter, setSerialCounter] = useState(1);

  // 1. 老闆決定「接受」訂單：自動產生取餐序號並改為製作中
  const handleAcceptOrder = (orderId) => {
    setOrders(orders.map(order => {
      if (order.orderId === orderId) {
        const newSerial = `#${serialCounter}`;
        setSerialCounter(serialCounter + 1); // 序號遞增
        return {
          ...order,
          status: 'processing',
          serialNumber: newSerial
        };
      }
      return order;
    }));
  };

  // 2. 老闆決定「拒絕」訂單
  const handleRejectOrder = (orderId) => {
    setOrders(orders.map(order => 
      order.orderId === orderId ? { ...order, status: 'rejected' } : order
    ));
  };

  // 3. 推進狀態：從製作中改成「已完成（餐點完成）」
  const handleCompleteOrder = (orderId) => {
    setOrders(orders.map(order => 
      order.orderId === orderId ? { ...order, status: 'completed' } : order
    ));
  };

  return (
    <div className="dashboard-container">
      {/* 頂部導覽 / 狀態列 */}
      <header className="dashboard-header">
        <h1>🍳 早餐店即時訂單管理後台</h1>
        <div className="store-status-badge">
          <span className="dot"></span> 營業中 (接單系統連線中)
        </div>
      </header>

      {/* 訂單看板主體 */}
      <main className="dashboard-main">
        <h2>即時訂單看板</h2>
        
        <div className="orders-grid">
          {orders.map(order => (
            <div key={order.orderId} className={`order-card status-${order.status}`}>
              
              {/* 卡片標題：訂單編號與預定取餐時間 */}
              <div className="card-top">
                <span className="order-id">單號：{order.orderId}</span>
                <span className="pickup-time">預定取餐：<strong>{order.pickupTime}</strong></span>
              </div>

              {/* 若已接單，顯示系統自動產生的取餐序號 */}
              {order.serialNumber && (
                <div className="serial-badge">
                  取餐序號：<strong>{order.serialNumber}</strong>
                </div>
              )}

              <div className="customer-info">
                顧客：<strong>{order.customerName}</strong>
              </div>

              {/* 餐點明細與客製化選項 */}
              <ul className="item-list">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    <span>{item.name} x {item.quantity}</span>
                    {Object.keys(item.options).length > 0 && (
                      <span className="item-opts">
                        ({Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(', ')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="order-total">
                金額：<strong>$ {order.total}</strong>
              </div>

              {/* 狀態動作按鈕 */}
              <div className="card-actions">
                {order.status === 'pending' && (
                  <div className="pending-actions">
                    <button 
                      className="btn accept"
                      onClick={() => handleAcceptOrder(order.orderId)}
                    >
                      接受訂單
                    </button>
                    <button 
                      className="btn reject"
                      onClick={() => handleRejectOrder(order.orderId)}
                    >
                      拒絕
                    </button>
                  </div>
                )}

                {order.status === 'processing' && (
                  <button 
                    className="btn complete"
                    onClick={() => handleCompleteOrder(order.orderId)}
                  >
                    餐點完成 (通知顧客)
                  </button>
                )}

                {order.status === 'completed' && (
                  <div className="status-tag completed">已完成 / 已通知</div>
                )}

                {order.status === 'rejected' && (
                  <div className="status-tag rejected">已婉拒此訂單</div>
                )}
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  );
}