// app/api/tokens/user/[telegramId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { telegramId: string } }
) {
  try {
    const telegramId = params.telegramId

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    const userTokens = await prisma.userToken.findMany({
      where: {
        user: {
          telegramId: Number(telegramId)
        }
      },
      include: {
        token: true
      }
    })

    // Format tokens for response
    const tokens = userTokens.map(ut => ({
      id: ut.token.id,
      name: ut.token.name,
      ticker: ut.token.ticker,
      logo: '🪙', // Default logo for now
      balance: ut.balance,
      value: ut.balance * ut.token.currentPrice,
      price: ut.token.currentPrice,
      isListed: ut.token.isListed,
      contractAddress: ut.token.contractAddress
    }))

    return NextResponse.json(tokens)
  } catch (error: any) {
    console.error('GET tokens error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}