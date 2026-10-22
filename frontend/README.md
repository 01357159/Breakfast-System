# 🍳 北寧路早餐店點餐與管理系統 (Breakfast Ordering & Management System)

本專案是一個專為校園周邊早餐店設計的輕量級點餐與營運管理系統，採用前後端分離的概念，並針對行動端與桌面端進行最佳化響應式設計。

Google 登入、已完成訂單評論與店家回覆的設定方式請見 [評論服務設定](../docs/reviews-setup.md)。顧客點餐不需登入；評論需以 Google 帳號認領已完成訂單。資料庫權限會限制顧客只能管理自己的評論，店家只能回覆。

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
