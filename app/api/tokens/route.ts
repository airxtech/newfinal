import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Handle GET requests (fetching tokens)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'all'
    
    let tokens
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    switch (view) {
      case 'hot':
        tokens = await prisma.token.findMany({
          orderBy: [
            {
              bondingCurve: 'desc'
            }
          ],
          where: {
            lastBondingUpdate: {
              gte: new Date(Date.now() - 10 * 60 * 1000)
            }
          }
        })
        break

      case 'new':
        tokens = await prisma.token.findMany({
          orderBy: [
            {
              createdAt: 'desc'
            }
          ]
        })
        break

      case 'listed':
        tokens = await prisma.token.findMany({
          where: {
            bondingCurve: 100
          },
          orderBy: [
            {
              bondingCompleteTime: 'desc'
            }
          ]
        })
        break

      case 'marketcap':
        tokens = await prisma.token.findMany({
          where: {
            bondingCurve: {
              lt: 100
            }
          },
          orderBy: [
            {
              bondingCurve: 'desc'
            }
          ]
        })
        break

      case 'my':
        const userId = searchParams.get('userId')
        if (!userId) break

        tokens = await prisma.token.findMany({
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
        tokens = await prisma.token.findMany({
          orderBy: [
            {
              bondingCurve: 'desc'
            }
          ]
        })
    }

    return NextResponse.json(tokens || [])
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}

// Handle POST requests (creating new tokens)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, ticker, description, imageUrl, creatorId } = body

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
        bondingCurve: 0,
        lastBondingUpdate: new Date()
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