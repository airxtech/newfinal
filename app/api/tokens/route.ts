// app/api/tokens/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')
    
    console.log('Processing request for view:', view)
    
    let where = {}
    let orderBy: any = { createdAt: 'desc' }

    switch (view) {
      case 'hot':
        where = {
          lastBondingUpdate: {
            not: null,
            gte: new Date(Date.now() - 10 * 60 * 1000)
          }
        }
        orderBy = { bondingCurve: 'desc' }
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

    const tokens = await prisma.token.findMany({
      where,
      orderBy,
      include: {
        transactions: true,
        holders: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    console.log(`Found ${tokens.length} tokens`)

    const transformedTokens = tokens.map(token => ({
      id: token.id,
      name: token.name,
      ticker: token.ticker,
      imageUrl: token.imageUrl,
      description: token.description,
      transactions: token.transactions.length,
      daysListed: Math.floor((Date.now() - new Date(token.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      priceChange: Math.random() * 20 - 10, // Mock data for now
      bondingProgress: token.bondingCurve,
      marketCap: token.marketCap,
      currentPrice: token.currentPrice,
      isGuaranteed: token.isGuaranteed,
      isListed: token.isListed,
      website: token.website,
      twitter: token.twitter,
      telegram: token.telegram,
      creator: token.creator,
      createdAt: token.createdAt,
      holdersCount: token.holders.length
    }))

    return NextResponse.json(transformedTokens)
  } catch (error) {
    console.error('Error in tokens API:', error)
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
    const { 
      name, 
      ticker, 
      description, 
      imageUrl, 
      website, 
      twitter, 
      telegram, 
      creatorId 
    } = body

    // Validation
    if (!name || !ticker || !description || !imageUrl || !creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create token
    const token = await prisma.token.create({
      data: {
        id: crypto.randomUUID(),
        name,
        ticker: ticker.toUpperCase(),
        description,
        imageUrl,
        website,
        twitter,
        telegram,
        creatorId,
        currentPrice: 0.00001, // Initial price
        marketCap: 3000, // Initial market cap (300M * 0.00001)
        bondingCurve: 0,
        lastBondingUpdate: new Date(),
        totalSupply: 300000000, // 300M tokens
        isListed: false,
        isGuaranteed: false
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Initial holder record for creator
    await prisma.userToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: creatorId,
        tokenId: token.id,
        balance: 300000000 // Creator gets all initial tokens
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