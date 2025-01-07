import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'all'
    
    let tokens
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    switch (view) {
      case 'hot':
        // Get tokens sorted by bonding curve rate
        tokens = await prisma.token.findMany({
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
        // Get user's tokens (both created and held)
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
        // 'all' view - same as hot but with continuous rotation
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