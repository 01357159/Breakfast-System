import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthControls from '../../auth/AuthControls';
import { ORDER_TYPE, normalizeOrderType } from '../../data/orderTypes';
import './css/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // QR Code 會帶入 mode（桌邊碼為 dine-in、外帶碼為 takeout），此時不再顯示選單讓顧客自行切換
  const qrMode = searchParams.get('mode') || searchParams.get('type');
  const isLockedByQr = Boolean(qrMode || searchParams.get('tableId'));
  const seatNumber = searchParams.get('seat') || 'A-01';
  const [orderType, setOrderType] = useState(normalizeOrderType(qrMode));

  const isTakeout = orderType === ORDER_TYPE.TAKEOUT;

  const buildQuery = (extra = {}) => {
    const params = new URLSearchParams({
      seat: seatNumber,
      type: orderType,
      mode: isTakeout ? 'takeout' : 'dine-in',
      ...extra,
    });
    if (isTakeout) params.delete('seat');
    else params.set('tableId', seatNumber);
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
        {/* QR Code 進入：直接顯示放大的桌號或外帶標示 */}
        {isLockedByQr ? (
          <div className={`home-hero ${isTakeout ? 'takeout' : 'dine-in'}`}>
            <span className="home-hero-label">{isTakeout ? '外帶取餐' : '內用桌號'}</span>
            <span className="home-hero-value">{isTakeout ? '🥡' : seatNumber}</span>
            {isTakeout && <span className="home-hero-hint">結帳時填寫取餐識別</span>}
          </div>
        ) : (
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
