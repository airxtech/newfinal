// lib/services/tonPriceService.ts
import { prisma } from '../prisma'

export class TonPriceService {
  private static readonly CMC_API_KEY = process.env.COINMARKETCAP_API_KEY
  private static readonly TON_CMC_ID = '11419' // TON's ID on CoinMarketCap

  static async updateTonPrice(): Promise<number> {
    try {
      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${this.TON_CMC_ID}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.CMC_API_KEY || '',
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch TON price')
      }

      const data = await response.json()
      const tonPrice = data.data[this.TON_CMC_ID].quote.USD.price

      // Store in database
      await prisma.tonPrice.create({
        data: {
          id: Date.now().toString(),
          price: tonPrice,
          timestamp: new Date()
        }
      })

      return tonPrice
    } catch (error) {
      console.error('Error updating TON price:', error)
      throw error
    }
  }

  static async getCurrentTonPrice(): Promise<number> {
    try {
      // First try to get the latest price from our database
      const latestPrice = await prisma.tonPrice.findFirst({
        orderBy: { timestamp: 'desc' },
        where: {
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Price not older than 15 minutes
          }
        }
      })

      if (latestPrice) {
        return latestPrice.price
      }

      // If no recent price found, fetch new price
      return await this.updateTonPrice()
    } catch (error) {
      console.error('Error getting TON price:', error)
      throw error
    }
  }
}