import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './css/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seatNumber = searchParams.get('seat') || "A-01";

  const handleStartOrder = () => {
    navigate(`/customer/menu?seat=${seatNumber}`);
  };

  // 💡 點擊跳轉到使用者登入頁面 (可依你的實際路由調整，例如 /login)
  const handleUserLogin = () => {
    navigate(`/login?seat=${seatNumber}`);
  };

  return (
    <div className="home-content-wrapper">
      
      {/* 頂部導覽列：加入使用者登入按鈕 */}
      <div className="home-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="home-title">北寧路早餐店</h1>
          <p className="home-subtitle">自助點餐系統</p>
        </div>
        <button onClick={handleUserLogin} className="home-user-login-btn">
          👤 會員登入
        </button>
      </div>

      <div className="home-main">
        <div className="home-image-container">
          <img 
            src="https://via.placeholder.com/300" 
            alt="歡迎光臨點餐" 
            className="home-image" 
          />
        </div>

        <div className="home-seat-badge">
          <span className="home-seat-label">桌號：</span>
          <span className="home-seat-text">{seatNumber}</span>
        </div>
      </div>

      <div className="home-footer">
        <button onClick={handleStartOrder} className="home-start-btn">
          開始點餐 ➔
        </button>
        <button className="home-reviews-btn" onClick={() => navigate(`/customer/reviews?seat=${encodeURIComponent(seatNumber)}`)}>
          ★ 查看顧客評價
        </button>
      </div>
    </div>
  );
}
