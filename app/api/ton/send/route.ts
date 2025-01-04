// app/api/ton/send/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recipientAddress, amount } = body

    if (!process.env.TONKEEPER_API_KEY || !process.env.PLATFORM_WALLET_SECRET) {
      throw new Error('API configuration missing')
    }

    // Create transfer using Tonkeeper API
    const response = await fetch(
      'https://api.tonkeeper.com/v2/transfers',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TONKEEPER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_wallet: {
            address: process.env.NEXT_PUBLIC_WALLET_ADDRESS,
            secret: process.env.PLATFORM_WALLET_SECRET
          },
          destination: recipientAddress,
          amount: amount.toString(), // in nanoTON
          comment: 'Token sale payout'
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Transfer error:', error)
      throw new Error('Failed to send TON')
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      transaction: result
    })

  } catch (error) {
    console.error('Send TON error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send TON',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}