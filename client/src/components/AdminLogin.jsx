import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple hardcoded password for demo
        localStorage.setItem('admin_auth', 'true');
        navigate('/admin/dashboard');
    } else {
        setError(true);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 space-y-6 bg-card rounded-xl border border-border shadow-lg">
        <h2 className="text-2xl font-bold text-center">Admin Access</h2>
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="text-sm font-medium">Password</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-1 bg-muted border border-input rounded-md px-3 py-2"
                    placeholder="Enter admin password"
                />
            </div>
            {error && <p className="text-red-500 text-xs">Invalid password</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">
                Login
            </button>
        </form>
      </div>
    </div>
  );
}
