import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';

// 引入顧客端與老闆端各自的主容器（或大檔案入口）
import CustomerApp from './pages/customer/CustomerApp.jsx';
import OwnerApp1 from './pages/owner1/OwnerApp.jsx';
import OwnerApp from './pages/owner/OwnerApp.jsx';
import AuthProvider from './auth/AuthProvider.jsx';

// 桌邊碼短網址：/t/A-01 → 內用並鎖定桌號
function TableRedirect() {
  const { tableId = '' } = useParams();
  const params = new URLSearchParams({ mode: 'dine-in', seat: tableId, tableId });
  return <Navigate to={`/customer?${params.toString()}`} replace />;
}

function App() {
  return (
    
    <AuthProvider><Router>
      <Routes>        
        {/* ================= 1. 根目錄預設導向 ================= */}
        {/* 依照妳的需求，預設進來可以先導向顧客端 (掃 QR code 情境) */}
        <Route path="/" element={<Navigate to="/customer" replace />} />

        {/* ================= 2. QR Code 短網址 ================= */}
        {/* 桌邊碼：/t/A-01；外帶碼：/takeout，方便日後更換導向 */}
        <Route path="/t/:tableId" element={<TableRedirect />} />
        <Route path="/takeout" element={<Navigate to="/customer?mode=takeout" replace />} />

        {/* ================= 3. 顧客端專區 (QR code 進入) ================= */}
        {/* 包裹著所有顧客端的手機版頁面與邏輯 */}
        <Route path="/customer/*" element={<CustomerApp />} />

        {/* ================= 4. 老闆端專區 (Owner) ================= */}
        {/* 包裹著所有老闆端的電腦版後台頁面與邏輯 */}
        <Route path="/admin/*" element={<OwnerApp1 />} />
        <Route path="/admin/dashboard" element={<OwnerApp />} />

        {/* ================= 5. 404 頁面防護 ================= */}
        <Route path="*" element={<div className="p-8 text-center text-red-500">404 - 找不到此頁面</div>} />
      </Routes>
    </Router></AuthProvider>
  );
}

export default App;
