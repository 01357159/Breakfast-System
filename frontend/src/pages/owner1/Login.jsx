import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. 引入 useNavigate
import './css/Login.css';

export default function Login() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const navigate = useNavigate(); // 2. 宣告導向工具

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!account || !password) {
      setErrorMessage('請輸入帳號與密碼');
      return;
    }

    // 模擬驗證成功
    if (account === 'admin' && password === '1234') {
      setErrorMessage('');
      // 3. 登入成功後，跳轉到後台面板網址
      // 因為外層是 /admin/*，這裡導向 /admin/dashboard
      navigate('/admin/dashboard'); 
    } else {
      setErrorMessage('帳號或密碼錯誤，請重新輸入 (預設: admin / 1234)');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🍳 早餐店管理後台</h2>
          <p>請登入以管理菜單與即時訂單</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="account">店家帳號</label>
            <input 
              type="text" 
              id="account"
              placeholder="請輸入帳號 (admin)" 
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼</label>
            <input 
              type="password" 
              id="password"
              placeholder="請輸入密碼 (1234)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMessage && <div className="error-msg">{errorMessage}</div>}

          <button type="submit" className="login-btn">
            登入後台
          </button>
        </form>
      </div>
    </div>
  );
}