# 🍳 北寧路早餐店點餐與管理系統 (Breakfast Ordering & Management System)

本專案是一個專為校園周邊早餐店設計的輕量級點餐與營運管理系統，採用前後端分離的概念，並針對行動端與桌面端進行最佳化響應式設計。

---

## 👥 雙核心介面設計 (Dual-Role Architecture)

本系統區分為兩個主要操作視圖，以滿足不同場景的需求：

1. **📱 顧客手機版 (Customer App)**
   - **情境**：顧客掃描桌上 QR Code 進入。
   - **特性**：採用手機優先（Mobile-First）的直覺式介面、置中行動裝置外框、流暢的菜單瀏覽與購物車互動。
2. **💻 老闆電腦版後台 (Owner App)**
   - **情境**：店內櫃台電腦或平板使用。
   - **特性**：寬螢幕滿版設計、即時接單列表、營業數據統計與菜單管理大表格。

---

## 🛠️ 技術堆疊 (Tech Stack)

* **前端框架**：React + Vite
* **樣式工具**：Tailwind CSS
* **路由管理**：React Router DOM
* **開發環境**：Node.js / npm

---

## 🚀 快速開始指南 (Local Development & Setup)

如果這是妳第一次把專案抓回本機，請依照以下步驟快速建立開發環境：

### 1. 複製專案
```bash
git clone [https://github.com/你的帳號名稱/Breakfast_System.git](https://github.com/你的帳號名稱/Breakfast_System.git)
cd Breakfast_System/frontend
```

---

## 📱 顧客端點餐流程

1. 掃描 QR Code 進入 `/customer?seat=A-01`。
2. 在首頁選擇 **內用** 或 **外帶**：
   - 內用：直接沿用 QR Code 帶入的桌號。
   - 外帶：需填寫取餐人姓名，餐點完成時依姓名叫號。
3. 進入菜單可搜尋餐點、依分類快速跳轉；購物車會依「取餐方式 + 桌號」暫存在瀏覽器。
4. 購物車確認取餐時間後送出，成功畫面可直接查看訂單狀態。
5. 老闆端訂單列表會標示內用／外帶，並可依取餐方式篩選。

### 資料庫更新（既有專案）

若使用 Supabase，且先前已執行過舊版 `supabase/schema.sql`，請再執行一次
`supabase/migrations/20261117_add_order_type.sql`，以新增 `order_type`、
`customer_name` 欄位與對應的 RPC。全新安裝則直接執行 `supabase/schema.sql` 即可。