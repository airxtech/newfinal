// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    
    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { 
        telegramId: Number(telegramId) 
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        zoaBalance: true,
        tonBalance: true,
        walletAddress: true,
        lastConnected: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('GET request error:', error)
    return NextResponse.json(
      { error: 'Database query failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      telegramId, 
      tonBalance,
      walletAddress 
    } = body

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { 
        telegramId: Number(telegramId) 
      },
      data: {
        ...(tonBalance !== undefined && { tonBalance }),
        ...(walletAddress && { 
          walletAddress,
          lastConnected: new Date() 
        })
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        zoaBalance: true,
        tonBalance: true,
        walletAddress: true,
        lastConnected: true
      }
    })
    
    return NextResponse.json(user)
  } catch (error: any) {
    console.error('POST request error:', error)
    return NextResponse.json(
      { error: 'Database operation failed', details: error.message },
      { status: 500 }
    )
  }
}