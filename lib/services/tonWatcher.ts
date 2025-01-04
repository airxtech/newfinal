// lib/services/tonWatcher.ts
import { prisma } from '../prisma'
import { Address, TonClient, fromNano } from '@ton/ton'
import { TransactionType, TransactionStatus } from '@prisma/client'

interface TonTransaction {
  hash: string;
  utime: number;
  in_msg?: {
    source: string;
    value: string;
  };
}

export class TonWatcher {
  private static instance: TonWatcher
  private client: TonClient
  private platformAddress: string
  private isWatching: boolean = false

  private constructor() {
    this.client = new TonClient({
      endpoint: process.env.TON_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY
    })
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
        const response = await this.client.getTransactions(
          Address.parse(this.platformAddress),
          { limit: 10 }
        );

        // Type assertion to handle the response correctly
        const transactions = response as unknown as TonTransaction[];

        for (const tx of transactions) {
          await this.processTransaction(tx)
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Error watching transactions:', error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  private async processTransaction(tx: TonTransaction) {
    const amount = fromNano(tx.in_msg?.value || '0')

    try {
      const transaction = await prisma.walletTransaction.upsert({
        where: { hash: tx.hash },
        update: {
          status: TransactionStatus.CONFIRMED,
          updatedAt: new Date()
        },
        create: {
          id: tx.hash,
          hash: tx.hash,
          sender: tx.in_msg?.source || '',
          recipient: this.platformAddress,
          amount: parseFloat(amount),
          timestamp: new Date(tx.utime * 1000),
          status: TransactionStatus.CONFIRMED,
          type: TransactionType.OTHER
        }
      })

      // Check if this is a token creation payment (0.3 TON)
      if (Math.abs(parseFloat(amount) - 0.3) < 0.001) {
        const pendingToken = await prisma.token.findFirst({
          where: {
            creator: { walletAddress: tx.in_msg?.source },
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