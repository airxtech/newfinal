// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')
    
    console.log('Processing request for view:', view)
    
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
          where = {
            OR: [
              { creatorId: userId },
              { holders: { some: { userId } } }
            ]
          }
        }
        break
        
      default:
        orderBy = { createdAt: 'desc' }
    }

    console.log('Query parameters:', { where, orderBy })

    // Fetch tokens with transactions and holders
    const tokens = await prisma.token.findMany({
      where,
      orderBy,
      include: {
        transactions: true,
        holders: true
      }
    })

    console.log(`Found ${tokens.length} tokens`)

    // Transform tokens for response
    const transformedTokens = tokens.map(token => {
      const msPerDay = 1000 * 60 * 60 * 24
      const daysListed = Math.floor((Date.now() - new Date(token.createdAt).getTime()) / msPerDay)

      return {
        id: token.id,
        name: token.name,
        ticker: token.ticker,
        logo: token.imageUrl,
        transactions: token.transactions.length,
        daysListed,
        priceChange: 0, // Calculate this based on transaction history
        bondingProgress: token.bondingCurve,
        marketCap: token.marketCap,
        isGuaranteed: token.isGuaranteed
      }
    })

    console.log('Successfully transformed tokens')
    return NextResponse.json(transformedTokens)
    
  } catch (error) {
    console.error('Error in tokens API:', error)
    
    // Check if it's a Prisma error
    if (error instanceof Error && 'code' in error) {
      console.error('Prisma error code:', error.code)
      return NextResponse.json(
        { error: `Database error: ${error.code}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}