import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import MerchantDashboard from "./MerchantDashboard"; // 你的後台面板

export default function OwnerApp() {
  // 1. 用一個 State 來記錄老闆是否已經登入（預設為 false 未登入）
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Routes>
      {/* 2. 登入頁：登入成功就把 isLoggedIn 改為 true */}
      <Route 
        path="login" 
        element={<Login onLoginSuccess={() => setIsLoggedIn(true)} />} 
      />
      <Route 
        path="/" 
        element={<Login onLoginSuccess={() => setIsLoggedIn(true)} />} 
      />

      {/* 3. 後台面板：加一道防護。如果 isLoggedIn 是 false，就強制導向回登入頁 */}
      <Route 
        path="dashboard" 
        element={isLoggedIn ? <MerchantDashboard /> : <Navigate to="/admin/login" replace />} 
      />
    </Routes>
  );
}