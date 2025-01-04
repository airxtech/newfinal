// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, ticker, description, imageUrl, creatorId, transactionHash } = body

    const token = await prisma.token.create({
      data: {
        id: crypto.randomUUID(),
        name,
        ticker: ticker.toUpperCase(),
        description,
        imageUrl,
        creatorId,
        currentPrice: 0.00001, // Initial price
        marketCap: 3000, // Initial market cap (300M * 0.00001)
        bondingCurve: 0
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