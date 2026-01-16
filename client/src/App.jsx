import React, { useEffect, useState } from 'react';
import { Board } from './components/Board';
import { Chat } from './components/Chat';
import { io } from 'socket.io-client';

// Initialize socket connection outside component to prevent reconnects on re-render
export const socket = io('http://localhost:3001');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
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

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Main Board Area */}
      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-14 border-b border-border flex items-center px-6 bg-card/50 backdrop-blur justify-between">
          <div className="flex items-center gap-2">
             <div className="h-6 w-6 rounded bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">ST</div>
             <h1 className="font-bold text-lg tracking-tight">SyncTeam</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
             {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </header>
        <main className="flex-1 overflow-hidden relative">
           <Board socket={socket} />
        </main>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 border-l border-border h-full bg-card hidden md:flex flex-col">
        <Chat socket={socket} />
      </div>
    </div>
  );
}

export default App;