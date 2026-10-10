import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 引入顧客端與老闆端各自的主容器（或大檔案入口）
import CustomerApp from './pages/customer/CustomerApp.jsx';
import OwnerApp from './pages/owner/OwnerApp.jsx';

function App() {
  return (
    
    <Router>
      <Routes>        
        {/* ================= 1. 根目錄預設導向 ================= */}
        {/* 依照妳的需求，預設進來可以先導向顧客端 (掃 QR code 情境) */}
        <Route path="/" element={<Navigate to="/customer" replace />} />

        {/* ================= 2. 顧客端專區 (QR code 進入) ================= */}
        {/* 包裹著所有顧客端的手機版頁面與邏輯 */}
        <Route path="/customer/*" element={<CustomerApp />} />

        {/* ================= 3. 老闆端專區 (Owner) ================= */}
        {/* 包裹著所有老闆端的電腦版後台頁面與邏輯 */}
        <Route path="/owner/*" element={<OwnerApp />} />

        {/* ================= 4. 404 頁面防護 ================= */}
        <Route path="*" element={<div className="p-8 text-center text-red-500">404 - 找不到此頁面</div>} />
      </Routes>
    </Router>
  );
}

export default App;