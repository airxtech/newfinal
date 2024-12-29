// app/api/tokens/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fetching token with ID:', params.id)

    const token = await prisma.token.findUnique({
      where: { id: params.id },
      include: {
        creator: true,
        holders: true,
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 50 // Get last 50 transactions
        }
      }
    })

    console.log('Found token:', token)

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    // Transform token data for response
    const transformedToken = {
      ...token,
      holderCount: token.holders.length,
      transactionCount: token.transactions.length,
      // Add any additional computed fields here
    }

    return NextResponse.json(transformedToken)
  } catch (error) {
    console.error('Error fetching token:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    )
  }
}