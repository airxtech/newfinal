// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    
    console.log('Searching for telegramId:', telegramId)

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
      include: {
        tasks: true
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
    console.error('GET user error:', error)
    return NextResponse.json(
      { error: 'Database query failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('POST user body:', body)
    
    const { telegramId, firstName, lastName, username, zoaBalance, scratchChances } = body

    // Generate a unique referral code
    const generateReferralCode = (telegramId: number): string => {
      const timestamp = Date.now().toString(36)
      const userPart = telegramId.toString(36)
      return `ZOA${userPart}${timestamp}`.toUpperCase()
    }

    const user = await prisma.user.upsert({
      where: { 
        telegramId: Number(telegramId) 
      },
      update: { 
        firstName,
        lastName,
        username,
        ...(zoaBalance !== undefined && { zoaBalance }),
        ...(scratchChances !== undefined && { scratchChances })
      },
      create: {
        id: telegramId.toString(),
        telegramId: Number(telegramId),
        firstName,
        lastName: lastName || '',
        username: username || '',
        zoaBalance: zoaBalance || 0,
        scratchChances: scratchChances || 3,
        referralCode: generateReferralCode(Number(telegramId))
      },
      include: {
        tasks: true
      }
    })
    
    return NextResponse.json(user)
  } catch (error: any) {
    console.error('POST user error:', error)
    return NextResponse.json(
      { error: 'Database operation failed', details: error.message },
      { status: 500 }
    )
  }
}