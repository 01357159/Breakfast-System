import './css/Dashboard.css';

export default function Dashboard({ todayRevenue, completedCount }) {
  return (
    <section className="owner-stats">
      <div className="stat-card revenue-card">
        <p>今日總營收</p>
        <h2>
          NT$ {todayRevenue.toLocaleString('zh-TW')}
        </h2>
      </div>

      <div className="stat-card completed-card">
        <p>已完成訂單</p>
        <h2>{completedCount} 筆</h2>
      </div>
    </section>
  );
}