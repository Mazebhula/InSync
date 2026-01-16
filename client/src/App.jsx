import React, { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { Chat } from './components/Chat';
import { Login } from './components/Login';
import { io } from 'socket.io-client';
import axios from 'axios';
import { LogOut } from 'lucide-react';

// Initialize socket connection outside component to prevent reconnects on re-render
export const socket = io('http://localhost:3001', {
  withCredentials: true 
});

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status
    axios.get('http://localhost:3001/api/me', { withCredentials: true })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleLogout = () => {
      axios.post('http://localhost:3001/auth/logout', {}, { withCredentials: true })
        .then(() => {
            setUser(null);
            window.location.reload();
        });
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Main Board Area */}
      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-14 border-b border-border flex items-center px-6 bg-card/50 backdrop-blur justify-between">
          <div className="flex items-center gap-2">
             <div className="h-6 w-6 rounded bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">ST</div>
             <h1 className="font-bold text-lg tracking-tight">SyncTeam</h1>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              
              <div className="flex items-center gap-2 pl-4 border-l border-border">
                  {user.photo && <img src={user.photo} className="h-6 w-6 rounded-full" alt={user.displayName} />}
                  <span className="text-sm font-medium">{user.displayName}</span>
                  <button onClick={handleLogout} className="ml-2 text-muted-foreground hover:text-destructive transition-colors">
                      <LogOut size={16} />
                  </button>
              </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden relative">
           <Board socket={socket} user={user} />
        </main>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 border-l border-border h-full bg-card hidden md:flex flex-col">
        <Chat socket={socket} user={user} />
      </div>
    </div>
  );
}

export default App;
