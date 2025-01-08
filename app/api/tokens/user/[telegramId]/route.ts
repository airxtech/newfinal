// app/api/tokens/user/[telegramId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    // First get the user
    const user = await prisma.user.findUnique({
      where: {
        telegramId: Number(telegramId)
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's tokens with full token information
    const userTokens = await prisma.userToken.findMany({
      where: {
        userId: user.id,
        balance: {
          gt: 0 // Only get tokens with positive balance
        }
      },
      include: {
        token: {
          select: {
            id: true,
            name: true,
            ticker: true,
            imageUrl: true,
            description: true,
            currentPrice: true,
            marketCap: true,
            bondingCurve: true,
            isListed: true,
            contractAddress: true,
            createdAt: true,
            creatorId: true
          }
        }
      },
      orderBy: {
        // Order by value (balance * price) descending
        balance: 'desc'
      }
    })

    // Also get tokens created by user (even if balance is 0)
    const createdTokens = await prisma.token.findMany({
      where: {
        creatorId: user.id,
        NOT: {
          id: {
            in: userTokens.map(ut => ut.tokenId) // Exclude tokens already included above
          }
        },
        isListed: false // Only include non-listed tokens
      },
      select: {
        id: true,
        name: true,
        ticker: true,
        imageUrl: true,
        description: true,
        currentPrice: true,
        marketCap: true,
        bondingCurve: true,
        isListed: true,
        contractAddress: true,
        createdAt: true,
        creatorId: true
      }
    })

    // Create UserToken entries for created tokens with 0 balance if they don't exist
    const createdTokenEntries = createdTokens.map(token => ({
      id: `${user.id}-${token.id}`,
      userId: user.id,
      tokenId: token.id,
      balance: 0,
      token
    }))

    // Combine both arrays and sort by value
    const allTokens = [
      ...userTokens,
      ...createdTokenEntries
    ].sort((a, b) => {
      const valueA = a.balance * a.token.currentPrice
      const valueB = b.balance * b.token.currentPrice
      return valueB - valueA
    })

    return NextResponse.json(allTokens)
  } catch (error) {
    console.error('Error fetching user tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}