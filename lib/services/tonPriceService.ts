// lib/services/tonPriceService.ts
import { prisma } from '../prisma';

export class TonPriceService {
  // Maximum age of cached price in milliseconds (15 minutes)
  private static MAX_CACHE_AGE = 15 * 60 * 1000;

  static async getCurrentPrice(): Promise<number> {
    try {
      // First, try to get the stored price
      const storedPrice = await prisma.tonPrice.findUnique({
        where: { id: 'current' }
      });

      const now = new Date();
      const priceAge = storedPrice 
        ? now.getTime() - storedPrice.timestamp.getTime() 
        : Infinity;

      // If price is too old or doesn't exist, fetch new price
      if (!storedPrice || priceAge > this.MAX_CACHE_AGE) {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd'
        );

        if (!response.ok) {
          // If we have a stored price, use it even if old
          if (storedPrice) return storedPrice.price;
          throw new Error('Failed to fetch TON price');
        }

        const data = await response.json();
        const newPrice = data['the-open-network'].usd;

        // Update stored price
        await prisma.tonPrice.upsert({
          where: { id: 'current' },
          update: {
            price: newPrice,
            timestamp: now
          },
          create: {
            id: 'current',
            price: newPrice,
            timestamp: now
          }
        });

        return newPrice;
      }

      // If stored price is fresh enough, use it
      return storedPrice.price;

    } catch (error) {
      // If any error occurs and we have a stored price, use it
      const fallbackPrice = await prisma.tonPrice.findUnique({
        where: { id: 'current' }
      });
      
      if (fallbackPrice) return fallbackPrice.price;
      
      // If all else fails, throw error
      throw error;
    }
  }
}