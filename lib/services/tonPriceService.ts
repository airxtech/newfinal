// lib/services/tonPriceService.ts
import { prisma } from '../prisma';

export class TonPriceService {
  private static readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private static priceCache: { value: number; timestamp: number } | null = null;

  static async updatePrice(): Promise<number> {
    try {
      const response = await fetch(
        'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=TON',
        {
          headers: {
            'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || '',
            'Accept': 'application/json'
          },
          next: { revalidate: 60 } // Cache for 1 minute
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TON price');
      }

      const data = await response.json();
      const price = data.data.TON[0].quote.USD.price;

      // Store in database
      await prisma.tonPrice.create({
        data: {
          id: Date.now().toString(),
          price,
          timestamp: new Date()
        }
      });

      // Update cache
      this.priceCache = {
        value: price,
        timestamp: Date.now()
      };

      return price;
    } catch (error) {
      console.error('Error updating TON price:', error);
      
      // Try to get the last known price from the database
      const lastPrice = await this.getLastKnownPrice();
      if (lastPrice) return lastPrice;
      
      throw error;
    }
  }

  private static async getLastKnownPrice(): Promise<number | null> {
    try {
      const lastPrice = await prisma.tonPrice.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      return lastPrice?.price || null;
    } catch {
      return null;
    }
  }

  static async getPrice(): Promise<number> {
    try {
      // Check cache first
      if (this.priceCache && 
          Date.now() - this.priceCache.timestamp < this.CACHE_DURATION) {
        return this.priceCache.value;
      }

      // Get latest price from database
      const lastPrice = await this.getLastKnownPrice();
      if (lastPrice) {
        this.priceCache = {
          value: lastPrice,
          timestamp: Date.now()
        };
        return lastPrice;
      }

      // If no price in cache or database, fetch new price
      return await this.updatePrice();
    } catch (error) {
      console.error('Error getting TON price:', error);
      throw error;
    }
  }
}