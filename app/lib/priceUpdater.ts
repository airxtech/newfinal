// app/lib/priceUpdater.ts
import { prisma } from '@/lib/prisma';

let updateInterval: NodeJS.Timeout;

export const startPriceUpdater = async () => {
  console.log('Starting price updater...');  // Debug log

  const updatePrice = async () => {
    console.log('Attempting to update TON price...'); // Debug log
    try {
      const response = await fetch('https://toncenter.com/api/v2/getTokenData');
      console.log('TON API Response:', response.status); // Debug log

      if (!response.ok) throw new Error('Failed to fetch TON price');
      
      const data = await response.json();
      console.log('Received price data:', data); // Debug log

      const price = data.price_usd;

      const result = await prisma.tonPrice.upsert({
        where: { id: 'current' },
        update: { price, timestamp: new Date() },
        create: { id: 'current', price, timestamp: new Date() }
      });
      console.log('Price updated in database:', result); // Debug log

    } catch (error) {
      console.error('Price update failed:', error);
    }
  };

  // Initial update
  await updatePrice();

  // Set up 15-minute interval updates
  updateInterval = setInterval(updatePrice, 15 * 60 * 1000);
  console.log('Price update interval set'); // Debug log
};

export const stopPriceUpdater = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
};