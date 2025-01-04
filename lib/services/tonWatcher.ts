// lib/services/tonWatcher.ts
import { prisma } from '../prisma'
import { TransactionType, TransactionStatus } from '@prisma/client'

interface TonConsoleTransaction {
  id: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  amount: string;
  date_create: number;
  date_expire: number;
  payment_link: string;
  pay_to_address: string;
  paid_by_address?: string;
}

export class TonWatcher {
  private static instance: TonWatcher
  private isWatching: boolean = false
  private platformAddress: string

  private constructor() {
    this.platformAddress = process.env.NEXT_PUBLIC_WALLET_ADDRESS!
  }

  public static getInstance(): TonWatcher {
    if (!TonWatcher.instance) {
      TonWatcher.instance = new TonWatcher()
    }
    return TonWatcher.instance
  }

  public async startWatching() {
    if (this.isWatching) return
    console.log('Starting TON wallet watcher...')

    try {
      this.isWatching = true
      await this.watchTransactions()
      console.log('Wallet watcher started successfully')
    } catch (error) {
      console.error('Error starting wallet watcher:', error)
      this.isWatching = false
    }
  }

  private async watchTransactions() {
    while (this.isWatching) {
      try {
        const response = await fetch(
          'https://tonconsole.com/api/v1/services/invoices/list?limit=10',
          {
            headers: {
              'Authorization': `Bearer ${process.env.TONCONSOLE_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          throw new Error(`TON Console API Error: ${response.status}`)
        }

        const transactions = await response.json()

        for (const tx of transactions.items) {
          if (tx.status === 'paid') {
            await this.processTransaction(tx)
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Error watching transactions:', error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  private async processTransaction(tx: TonConsoleTransaction) {
    try {
      const amount = parseFloat(tx.amount) / 1e9 // Convert from nanoTON to TON

      const transaction = await prisma.walletTransaction.upsert({
        where: { hash: tx.id },
        update: {
          status: TransactionStatus.CONFIRMED,
          updatedAt: new Date()
        },
        create: {
          id: tx.id,
          hash: tx.id,
          sender: tx.paid_by_address || '',
          recipient: this.platformAddress,
          amount: amount,
          timestamp: new Date(tx.date_create * 1000),
          status: TransactionStatus.CONFIRMED,
          type: TransactionType.OTHER
        }
      })

      // Check if this is a token creation payment (0.3 TON)
      if (Math.abs(amount - 0.3) < 0.001) {
        const pendingToken = await prisma.token.findFirst({
          where: {
            creator: { walletAddress: tx.paid_by_address },
            walletTransactions: { 
              none: { 
                type: TransactionType.CREATE 
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        if (pendingToken) {
          await prisma.walletTransaction.update({
            where: { id: transaction.id },
            data: {
              type: TransactionType.CREATE,
              tokenId: pendingToken.id
            }
          })
        }
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    }
  }

  public async stopWatching() {
    this.isWatching = false
  }
}