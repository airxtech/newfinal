// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TransactionType, TransactionStatus } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tokenId, txHash } = body

    // Look for transaction in our database
    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        AND: [
          { tokenId },
          { type: TransactionType.CREATE },
          { status: TransactionStatus.CONFIRMED }
        ]
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update token status
    await prisma.token.update({
      where: { id: tokenId },
      data: { 
        currentPrice: 0.00001, // Initial price
        marketCap: 3000, // Initial market cap (300M * 0.00001)
        bondingCurve: 0 // Starting bonding curve
      }
    })

    return NextResponse.json({ 
      success: true,
      transaction
    })

  } catch (error) {
    console.error('Transaction verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}