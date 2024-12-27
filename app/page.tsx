'use client';

import React, { useEffect, useState } from 'react';

interface User {
  id: string;
  firstName: string;
  balance: number;
}

interface TelegramWebApp {
  initData: string;
  ready?: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isFarming, setIsFarming] = useState(false);
  const [farmingTime, setFarmingTime] = useState(0);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const authenticate = async () => {
      try {
        const tg = window?.Telegram?.WebApp;
        console.log('WebApp:', tg);
        console.log('InitData:', tg?.initData);

        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            initData: tg?.initData || '',
          }),
        });

        const data = await response.json();
        console.log('Auth response:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        setUser(data.user);
        tg?.ready?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        setError(errorMessage);
        console.error('Authentication error:', error);
      }
    };

    authenticate();
  }, [isClient]);

  useEffect(() => {
    if (!isFarming) return;
    const interval = setInterval(() => setFarmingTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isFarming]);

  const handleFarmingToggle = async () => {
    if (!user) return;
    
    if (isFarming) {
      try {
        const response = await fetch('/api/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, amount: farmingTime }),
        });

        if (!response.ok) throw new Error('Failed to update balance');

        const data = await response.json();
        setUser(prev => prev ? { ...prev, balance: data.balance } : null);
        setFarmingTime(0);
      } catch (error) {
        console.error('Balance update error:', error);
      }
    }
    setIsFarming(!isFarming);
  };

  if (!isClient) return <div className="p-4">Loading...</div>;

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  if (!user) return <div className="p-4">Loading... (Initializing Telegram WebApp...)</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user.firstName}!</h1>
        <div className="mb-4">
          <p className="text-lg">Balance: {user.balance}</p>
          {isFarming && <p className="text-lg">Farming Time: {farmingTime}</p>}
        </div>
        <button
          onClick={handleFarmingToggle}
          className={`w-full py-2 px-4 rounded ${
            isFarming ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          } text-white font-bold`}
        >
          {isFarming ? 'Stop Farming' : 'Start Farming'}
        </button>
      </div>
    </div>
  );
};

export default Home;