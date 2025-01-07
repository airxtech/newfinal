// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Handle GET requests (fetching tokens)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'all'
    console.log('API: Fetching tokens with view:', view)
    
    let tokens: any[] = []
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    // Base query options
    const baseQuery = {
      select: {
        id: true,
        name: true,
        ticker: true,
        imageUrl: true,
        currentPrice: true,
        marketCap: true,
        bondingCurve: true,
        createdAt: true,
        transactions: true,
        isListed: true,
        bondingCompleteTime: true,
        lastBondingUpdate: true
      }
    }

    switch (view) {
      case 'hot':
        console.log('Fetching hot tokens...')
        tokens = await prisma.token.findMany({
          ...baseQuery,
          orderBy: [
            {
              bondingCurve: 'desc'
            }
          ],
          where: {
            lastBondingUpdate: {
              gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
            }
          }
        })
        break

      case 'new':
        console.log('Fetching new tokens...')
        tokens = await prisma.token.findMany({
          ...baseQuery,
          orderBy: [
            {
              createdAt: 'desc'
            }
          ]
        })
        break

      case 'listed':
        console.log('Fetching listed tokens...')
        tokens = await prisma.token.findMany({
          ...baseQuery,
          where: {
            bondingCurve: 100,
            isListed: true
          },
          orderBy: [
            {
              bondingCompleteTime: 'desc'
            }
          ]
        })
        break

      case 'marketcap':
        console.log('Fetching tokens by market cap...')
        tokens = await prisma.token.findMany({
          ...baseQuery,
          where: {
            bondingCurve: {
              lt: 100
            }
          },
          orderBy: [
            {
              marketCap: 'desc'
            }
          ]
        })
        break

      case 'my':
        console.log('Fetching user tokens...')
        const userId = searchParams.get('userId')
        if (!userId) {
          console.log('No userId provided for my view')
          break
        }

        tokens = await prisma.token.findMany({
          ...baseQuery,
          where: {
            OR: [
              { creatorId: userId },
              {
                holders: {
                  some: {
                    userId
                  }
                }
              }
            ]
          }
        })
        break

      default:
        console.log('Fetching all tokens...')
        tokens = await prisma.token.findMany({
          ...baseQuery,
          orderBy: [
            {
              bondingCurve: 'desc'
            }
          ]
        })
    }

    console.log(`Found ${tokens?.length || 0} tokens`)

    // Transform tokens for response
    const transformedTokens = tokens?.map(token => {
      // Calculate days listed
      const daysListed = token.createdAt
        ? (new Date().getTime() - new Date(token.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        : 0

      // Calculate price change (mock data for now)
      const priceChange = Math.random() * 20 - 10 // Random value between -10 and 10

      return {
        ...token,
        logo: '🪙', // Default logo
        transactions: token.transactions?.length || 0,
        daysListed,
        priceChange
      }
    }) || []

    console.log('Returning transformed tokens:', transformedTokens.length)
    return NextResponse.json(transformedTokens)
  } catch (error) {
    console.error('Error in tokens API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}