export default function OwnerApp() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 老闆端標題 */}
      <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">💻 老闆電腦版即時接單後台</h1>
          <p className="text-sm text-gray-400 mt-1">管理即時訂單、菜單上架與銷售統計數據</p>
        </div>
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm animate-pulse">
          🔴 營業中
        </div>
      </div>

      {/* 老闆端後台主內容網格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200 md:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📦 即時訂單列表</h2>
          <div className="text-gray-400 text-sm py-12 text-center bg-gray-50 rounded-xl border border-dashed">
            目前尚無新進訂單，等待顧客下單中...
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📊 今日營運數據</h2>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm text-orange-600 font-medium">今日總營收</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">NT$ 0</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">已完成訂單</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">0 筆</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}