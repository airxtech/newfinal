// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')
    
    console.log('Processing request for view:', view)
    
    let where = {}
    let orderBy: any = { createdAt: 'desc' } // Default ordering

    // Apply filters based on view
    switch (view) {
      case 'hot':
        where = {
          lastBondingUpdate: {
            not: null,
            gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
          }
        }
        orderBy = { bondingCurve: 'desc' }
        break
        
      case 'new':
        // Already using default orderBy
        break
        
      case 'listed':
        where = { 
          isListed: true,
          bondingCurve: 100
        }
        orderBy = { listingDate: 'desc' }
        break
        
      case 'marketcap':
        where = { 
          bondingCurve: { lt: 100 },
          marketCap: { gt: 0 }
        }
        orderBy = { marketCap: 'desc' }
        break
        
      case 'my':
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
    }

    console.log('Query parameters:', { where, orderBy })

    // Execute the query
    const tokens = await prisma.token.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        ticker: true,
        imageUrl: true,
        currentPrice: true,
        marketCap: true,
        bondingCurve: true,
        createdAt: true,
        isListed: true,
        isGuaranteed: true,
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            timestamp: true
          }
        }
      }
    })

    console.log(`Found ${tokens.length} tokens`)

    // Transform tokens for response
    const transformedTokens = tokens.map(token => {
      const msPerDay = 1000 * 60 * 60 * 24
      const daysListed = Math.floor((Date.now() - new Date(token.createdAt).getTime()) / msPerDay)

      // Calculate price change (mock for now)
      const priceChange = Math.random() * 20 - 10 // Random value between -10 and 10

      return {
        id: token.id,
        name: token.name,
        ticker: token.ticker,
        logo: '🪙', // Default logo
        transactions: token.transactions.length,
        daysListed,
        priceChange,
        bondingProgress: token.bondingCurve,
        marketCap: token.marketCap,
        isGuaranteed: token.isGuaranteed
      }
    })

    console.log('Successfully transformed tokens')
    return NextResponse.json(transformedTokens)
    
  } catch (error) {
    console.error('Error in tokens API:', error)
    
    // Handle Prisma errors
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