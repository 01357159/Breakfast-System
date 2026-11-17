import { useState } from 'react';
import { TABLE_IDS, DINE_IN_PATH, TAKEOUT_PATH } from '../../data/tables';
import './css/OwnerApp.css';

// 櫃台用：列出桌邊碼與外帶碼的短網址，可直接貼到任何 QR Code 產生器。
export default function QrCodes() {
  const [copied, setCopied] = useState('');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const copy = async (path) => {
    const url = `${origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(path);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      window.prompt('請手動複製這個網址', url);
    }
  };

  return (
    <section className="owner-panel qr-panel">
      <div className="owner-panel-heading">
        <h2>QR Code 連結</h2>
        <button type="button" onClick={() => window.print()}>列印</button>
      </div>

      <div className="qr-block">
        <h3>🥡 外帶碼（全店共用）</h3>
        <p>張貼於門口、櫃檯或外帶窗口。顧客掃碼後直接進入外帶流程，不會看到桌號欄位。</p>
        <div className="qr-link-row">
          <code>{origin}{TAKEOUT_PATH}</code>
          <button type="button" onClick={() => copy(TAKEOUT_PATH)}>
            {copied === TAKEOUT_PATH ? '已複製' : '複製'}
          </button>
        </div>
      </div>

      <div className="qr-block">
        <h3>🍽️ 桌邊碼（每桌一碼）</h3>
        <p>張貼於桌邊。掃碼後會鎖定該桌桌號，顧客無法自行更改。</p>
        <div className="qr-table-grid">
          {TABLE_IDS.map((tableId) => {
            const path = DINE_IN_PATH(tableId);
            return (
              <div className="qr-table-card" key={tableId}>
                <strong>{tableId}</strong>
                <code>{origin}{path}</code>
                <button type="button" onClick={() => copy(path)}>
                  {copied === path ? '已複製' : '複製'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="qr-note">
        將上面的網址貼到任何 QR Code 產生器即可印出。日後若要更換導向，只需修改短網址
        <code>/t/桌號</code> 與 <code>/takeout</code> 的轉址設定。
      </p>
    </section>
  );
}
