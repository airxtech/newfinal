// app/api/ton/verify-transaction/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TransactionStatus, TransactionType } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { senderAddress, tokenId } = body

    // Wait for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Check if we've received the payment
    const transaction = await prisma.walletTransaction.findFirst({
      where: {
        sender: senderAddress,
        type: TransactionType.CREATE,  // Using enum value
        tokenId: tokenId,
        status: TransactionStatus.CONFIRMED  // Using enum value
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Payment not found', verified: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      verified: true,
      transaction: {
        hash: transaction.hash,
        amount: transaction.amount,
        timestamp: transaction.timestamp
      }
    })

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}