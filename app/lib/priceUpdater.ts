// app/lib/priceUpdater.ts
import { prisma } from "@/lib/prisma";

let updateInterval: NodeJS.Timeout;

export const startPriceUpdater = async () => {
  // Function to update price
  const updatePrice = async () => {
    try {
      const response = await fetch('https://toncenter.com/api/v2/getTokenData');
      if (!response.ok) throw new Error('Failed to fetch TON price');
      
      const data = await response.json();
      const price = data.price_usd;

      await prisma.tonPrice.upsert({
        where: { id: 'current' },
        update: { price, timestamp: new Date() },
        create: { id: 'current', price, timestamp: new Date() }
      });

      console.log('TON Price updated:', price);
    } catch (error) {
      console.error('Price update failed:', error);
    }
  };

  // Initial update
  await updatePrice();

  // Set up 15-minute interval updates
  updateInterval = setInterval(updatePrice, 15 * 60 * 1000);
};

export const stopPriceUpdater = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
};