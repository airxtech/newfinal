// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      name, 
      ticker, 
      description, 
      imageUrl,
      website,
      twitter,
      telegram,
      creatorId,
      paymentTxHash  // Transaction hash from TON payment
    } = body

    // Verify TON payment
    if (!paymentTxHash) {
      return NextResponse.json(
        { error: 'Payment required' },
        { status: 400 }
      )
    }

    // Create token
    const token = await prisma.token.create({
      data: {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        ticker: ticker.toUpperCase(),
        description,
        imageUrl,
        website,
        twitter,
        telegram,
        creatorId,
        currentPrice: 0.001, // Initial price
        marketCap: 0,
        bondingCurve: 0,
        totalSupply: 300000000, // 300M tokens
        isGuaranteed: false
      }
    })

    return NextResponse.json(token)
  } catch (error) {
    console.error('Token creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    )
  }
}