import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard({ socket }) {
  const [qrCode, setQrCode] = useState('');
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
      // Check auth
      if (!localStorage.getItem('admin_auth')) {
          navigate('/admin');
      }

      const onQR = (qr) => {
          console.log("QR received", qr);
          setQrCode(qr);
          setIsReady(false);
      };

      const onReady = () => {
          setIsReady(true);
          setQrCode('');
      };

      socket.on('admin:qr', onQR);
      socket.on('admin:ready', onReady);

      return () => {
          socket.off('admin:qr', onQR);
          socket.off('admin:ready', onReady);
      };
  }, [socket, navigate]);

  const handleLogout = () => {
      localStorage.removeItem('admin_auth');
      navigate('/admin');
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
            <h1 className="font-bold text-lg">Admin Dashboard</h1>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">WhatsApp Connection Status</h2>
                <p className="text-muted-foreground">Scan the QR code below to link the WhatsApp bot.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                {isReady ? (
                    <div className="flex flex-col items-center justify-center h-64 w-64 text-green-600 space-y-4">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
                        <p className="font-bold text-lg text-gray-800">WhatsApp is Connected!</p>
                        <p className="text-xs text-gray-500">You are ready to receive tasks.</p>
                    </div>
                ) : qrCode ? (
                    <div className="h-auto w-auto max-w-[256px]">
                        <QRCode
                            size={256}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            value={qrCode}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 w-64 text-gray-400">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                        <p>Waiting for QR Code...</p>
                        <p className="text-xs mt-2 text-center max-w-[200px]">Check if the server is restarting or if you are already connected.</p>
                    </div>
                )}
            </div>

            {isReady && (
                <div className="max-w-md text-center bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm text-blue-400">
                    Bot is active. You can close this page. Messages sent to the linked number will appear on the board.
                </div>
            )}
        </main>
    </div>
  );
}
