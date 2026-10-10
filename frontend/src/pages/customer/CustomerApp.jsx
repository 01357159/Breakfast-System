import React from 'react';
import { useNavigate } from 'react-router-dom';
import './css/CustomerApp.css'; // 引入對應的 CSS 檔案

export default function CustomerApp({ seatNumber = "A-01", imageUrl = "https://via.placeholder.com/300" }) {
  const navigate = useNavigate();

  const handleStartOrder = () => {
    navigate(`/menu?seat=${seatNumber}`);
  };

  return (
    <div className="customer-app-container">
      <div className="customer-app-card">
        
        {/* 頂部標題 */}
        <div className="customer-app-header">
          <h1 className="customer-app-title">北寧路早餐店點餐系統</h1>
          <p className="customer-app-subtitle">Self-Service Ordering</p>
        </div>

        {/* 中間內容區（座號與圖片） */}
        <div className="customer-app-content">
          <div className="customer-image-container">
            <img
              src={imageUrl}
              alt="歡迎光臨點餐"
              className="customer-image"
            />
          </div>
          <div className="customer-seat-badge">
            <span className="customer-seat-label">您的座位：</span>
            <span className="customer-seat-text">{seatNumber}</span>
          </div>

        </div>

        {/* 底部按鈕 */}
        <div className="customer-app-footer">
          <button onClick={handleStartOrder} className="customer-start-btn">
            開始點餐 ➔
          </button>
        </div>

      </div>
    </div>
  );
}