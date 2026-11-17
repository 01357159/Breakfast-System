import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import heroImage from '../../assets/hero.png';
import AuthControls from '../../auth/AuthControls';
import { ORDER_TYPE, normalizeOrderType } from '../../data/orderTypes';
import './css/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const seatNumber = searchParams.get('seat') || 'A-01';
  const [orderType, setOrderType] = useState(normalizeOrderType(searchParams.get('type')));

  const isTakeout = orderType === ORDER_TYPE.TAKEOUT;

  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams({ seat: seatNumber, type: orderType, ...extra });
    return params.toString();
  };

  const handleStartOrder = () => {
    navigate(`/customer/menu?${buildQuery()}`);
  };

  return (
    <div className="home-content-wrapper">
      {/* 頂部導覽列 */}
      <div className="home-header">
        <div>
          <h1 className="home-title">北寧路早餐店</h1>
          <p className="home-subtitle">自助點餐系統</p>
        </div>
        <AuthControls compact />
      </div>

      <div className="home-main">
        <div className="home-image-container">
          <img src={heroImage} alt="早餐店招牌餐點" className="home-image" />
        </div>

        {/* 內用 / 外帶 分流 */}
        <div className="home-mode-group" role="radiogroup" aria-label="取餐方式">
          <button
            type="button"
            role="radio"
            aria-checked={!isTakeout}
            className={`home-mode-card ${!isTakeout ? 'active' : ''}`}
            onClick={() => setOrderType(ORDER_TYPE.DINE_IN)}
          >
            <span className="home-mode-icon" aria-hidden="true">🍽️</span>
            <span className="home-mode-text">
              <strong>內用</strong>
              <small>桌號 {seatNumber}</small>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={isTakeout}
            className={`home-mode-card ${isTakeout ? 'active' : ''}`}
            onClick={() => setOrderType(ORDER_TYPE.TAKEOUT)}
          >
            <span className="home-mode-icon" aria-hidden="true">🥡</span>
            <span className="home-mode-text">
              <strong>外帶</strong>
              <small>到店取餐</small>
            </span>
          </button>
        </div>

        {isTakeout ? (
          <div className="home-pickup-hint">
            <strong>🥡 外帶取餐</strong>
            <span>結帳時可填寫取餐識別（稱呼或手機末三碼），方便叫號。</span>
          </div>
        ) : (
          <div className="home-seat-badge">
            <span className="home-seat-label">內用桌號：</span>
            <span className="home-seat-text">{seatNumber}</span>
          </div>
        )}
      </div>

      <div className="home-footer">
        <button
          onClick={handleStartOrder}
          className="home-start-btn"
        >
          {isTakeout ? '外帶點餐 ➔' : '內用點餐 ➔'}
        </button>
        <button
          className="home-reviews-btn"
          onClick={() => navigate(`/customer/reviews?${buildQuery()}`)}
        >
          ★ 查看顧客評價
        </button>
      </div>
    </div>
  );
}
