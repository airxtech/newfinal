// app/page.tsx
'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
      };
    };
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isFarming, setIsFarming] = useState(false);
  const [farmingTime, setFarmingTime] = useState(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const authenticate = async () => {
      try {
        console.log('WebApp:', window.Telegram?.WebApp);
        console.log('InitData:', window.Telegram?.WebApp?.initData);

        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: window.Telegram?.WebApp?.initData || '',
          }),
        });

        const data = await response.json();
        console.log('Auth response:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        setUser(data.user);
        window.Telegram?.WebApp?.ready();
      } catch (error: any) {
        setError(error.message);
        console.error('Authentication error:', error);
      }
    };

    authenticate();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFarming) {
      interval = setInterval(() => {
        setFarmingTime(prev => prev + 1);
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [isFarming]);

  const handleFarmingToggle = async () => {
    if (isFarming) {
      try {
        const response = await fetch('/api/balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            amount: farmingTime,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update balance');
        }

        const data = await response.json();
        setUser((prev: any) => ({ ...prev, balance: data.balance }));
        setFarmingTime(0);
      } catch (error) {
        console.error('Balance update error:', error);
      }
    }
    setIsFarming(!isFarming);
  };

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!user) {
    return <div className="p-4">Loading... (WebApp Data: {window.Telegram?.WebApp?.initData || 'Not found'})</div>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user.firstName}!</h1>
        <div className="mb-4">
          <p className="text-lg">Balance: {user.balance}</p>
          {isFarming && (
            <p className="text-lg">Farming Time: {farmingTime}</p>
          )}
        </div>
        <button
          onClick={handleFarmingToggle}
          className={`w-full py-2 px-4 rounded ${
            isFarming
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white font-bold`}
        >
          {isFarming ? 'Stop Farming' : 'Start Farming'}
        </button>
      </div>
    </div>
  );
}