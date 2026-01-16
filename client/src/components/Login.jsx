import React from 'react';

export function Login() {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/google';
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl border border-border shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded bg-indigo-500 flex items-center justify-center font-bold text-white text-xl mb-4">ST</div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">SyncTeam</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to collaborate with your team</p>
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
          Sign in with Google
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
           By signing in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
