// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')
    const userId = searchParams.get('userId')

    let tokens
    
    switch (view) {
      case 'hot':
        // Sort by bonding curve rate increase in last 10 minutes
        tokens = await prisma.token.findMany({
          orderBy: {
            bondingCurve: 'desc'
          }
        })
        break

      case 'new':
        // Sort by creation date
        tokens = await prisma.token.findMany({
          orderBy: {
            createdAt: 'desc'
          }
        })
        break

      case 'listed':
        // Show only fully listed tokens
        tokens = await prisma.token.findMany({
          where: {
            isListed: true
          },
          orderBy: {
            listingDate: 'desc'
          }
        })
        break

      case 'marketcap':
        // Sort by bonding curve completion but exclude 100% completed
        tokens = await prisma.token.findMany({
          where: {
            bondingCurve: {
              lt: 100
            }
          },
          orderBy: {
            marketCap: 'desc'
          }
        })
        break

      case 'my':
        // Show user's created tokens and holdings
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID required for my tokens view' },
            { status: 400 }
          )
        }
        tokens = await prisma.token.findMany({
          where: {
            OR: [
              { creatorId: userId },
              {
                holders: {
                  some: {
                    userId: userId
                  }
                }
              }
            ]
          }
        })
        break

      default:
        // 'all' view - sort by hot tokens by default
        tokens = await prisma.token.findMany({
          orderBy: {
            bondingCurve: 'desc'
          }
        })
    }

    // Calculate additional fields
    const enrichedTokens = tokens.map(token => {
      const createdDate = new Date(token.createdAt)
      const now = new Date()
      const daysListed = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)

      return {
        ...token,
        daysListed,
        priceChange: 0, // TODO: Calculate from transaction history
        transactions: 0, // TODO: Count from transaction history
      }
    })

    // For 'all' view, make tokens rotate by updating order every minute
    if (!view || view === 'all') {
      const minute = Math.floor(Date.now() / 60000)
      const rotateAmount = minute % enrichedTokens.length
      const rotatedTokens = [
        ...enrichedTokens.slice(rotateAmount),
        ...enrichedTokens.slice(0, rotateAmount)
      ]
      return NextResponse.json(rotatedTokens)
    }

    return NextResponse.json(enrichedTokens)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}