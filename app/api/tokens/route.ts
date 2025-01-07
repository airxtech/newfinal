// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Handle GET requests (fetching tokens)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'all'
    console.log('API: Fetching tokens with view:', view)
    
    // Test database connection first
    try {
      await prisma.$connect()
      console.log('Database connection successful')
    } catch (connError) {
      console.error('Database connection error:', connError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    let tokens
    const now = new Date()

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

    try {
      // Default query for all tokens
      tokens = await prisma.token.findMany({
        ...baseQuery,
        orderBy: [
          {
            bondingCurve: 'desc'
          }
        ]
      })

      console.log('Initial query successful, found tokens:', tokens?.length)
    } catch (queryError) {
      console.error('Query error:', queryError)
      if (queryError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error code:', queryError.code)
        return NextResponse.json(
          { error: `Database query failed: ${queryError.code}` },
          { status: 500 }
        )
      }
      throw queryError
    }

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
    console.error('Unhandled error in tokens API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}