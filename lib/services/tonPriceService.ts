// lib/services/tonPriceService.ts
import { prisma } from '../prisma';

export class TonPriceService {
  static async updatePrice(): Promise<number> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch TON price');
      }

      const data = await response.json();
      const price = data['the-open-network'].usd;

      // Update price in database
      await prisma.tonPrice.upsert({
        where: { id: 'current' },
        update: { price, timestamp: new Date() },
        create: { id: 'current', price, timestamp: new Date() }
      });

      return price;
    } catch (error) {
      console.error('Error updating TON price:', error);
      throw error;
    }
  }

  static async getCurrentPrice(): Promise<number> {
    try {
      // Always attempt to get fresh price first
      return await this.updatePrice();
    } catch (error) {
      // Fallback to last stored price if update fails
      const lastPrice = await prisma.tonPrice.findUnique({
        where: { id: 'current' }
      });
      return lastPrice?.price || 0;
    }
  }
}