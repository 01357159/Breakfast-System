import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';       // 引入 Home 元件
import Menu from './Menu';       // 引入 Menu 元件
import './css/CustomerApp.css';

export default function CustomerApp() {
  return (
    <div className="customer-app-container">
      <div className="customer-app-card">
        <Routes>
          {/* 1. 明確指定的子路由放前面 */}
          <Route path="menu" element={<Menu />} />
          
          {/* 2. 根目錄 / 預設顯示 Home */}
          <Route path="/" element={<Home />} />
          
          {/* 3. 萬用字元 (*) 必須放在最後面，作為找不到頁面時的防護 */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </div>
  );
}