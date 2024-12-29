// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')

    let where = {}
    let orderBy = {}

    // Apply filters based on view
    switch (view) {
      case 'hot':
        orderBy = { bondingCurve: 'desc' }
        break
      case 'new':
        orderBy = { createdAt: 'desc' }
        break
      case 'listed':
        where = { isListed: true }
        orderBy = { listingDate: 'desc' }
        break
      case 'marketcap':
        where = { bondingCurve: { lt: 100 } } // Not fully filled
        orderBy = { marketCap: 'desc' }
        break
      case 'my':
        // Handle my tokens view if user ID is provided
        const userId = searchParams.get('userId')
        if (userId) {
          where = { creatorId: userId }
        }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    console.log('Fetching tokens with where:', where, 'orderBy:', orderBy)

    const tokens = await prisma.token.findMany({
      where,
      orderBy,
      include: {
        transactions: true,
        holders: true
      }
    })

    console.log('Found tokens:', tokens)

    // Transform tokens for response
    const transformedTokens = tokens.map(token => ({
      id: token.id,
      name: token.name,
      ticker: token.ticker,
      logo: token.imageUrl,
      transactions: token.transactions.length,
      daysListed: Math.floor((Date.now() - token.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      priceChange: 0, // Calculate this based on transaction history
      bondingProgress: token.bondingCurve,
      marketCap: token.marketCap,
      isGuaranteed: token.isGuaranteed
    }))

    return NextResponse.json(transformedTokens)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}