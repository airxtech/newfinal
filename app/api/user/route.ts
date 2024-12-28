// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    
    console.log('[API] GET user - telegramId:', telegramId)

    if (!telegramId) {
      console.log('[API] GET user - No telegramId provided')
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    // First try to find the user
    try {
      const user = await prisma.user.findUnique({
        where: { 
          telegramId: Number(telegramId) 
        }
      })

      console.log('[API] GET user - Found user:', user)
      
      if (!user) {
        // If user doesn't exist, create one
        console.log('[API] GET user - User not found, creating new user')
        const newUser = await prisma.user.create({
          data: {
            id: telegramId.toString(),
            telegramId: Number(telegramId),
            firstName: 'Anonymous',
            lastName: '',
            username: '',
            zoaBalance: 0,
            scratchChances: 3,
            referralCode: `ZOA${telegramId}${Date.now().toString(36)}`.toUpperCase()
          }
        })

        console.log('[API] GET user - Created new user:', newUser)
        return NextResponse.json(newUser)
      }

      return NextResponse.json(user)
    } catch (dbError: any) {
      console.error('[API] GET user - Database error:', dbError)
      return NextResponse.json(
        { error: 'Database operation failed', details: dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[API] GET user - Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[API] POST user - Request body:', body)
    
    const { telegramId, firstName, lastName, username, zoaBalance, scratchChances } = body

    if (!telegramId) {
      console.log('[API] POST user - No telegramId provided')
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    try {
      const user = await prisma.user.upsert({
        where: { 
          telegramId: Number(telegramId) 
        },
        update: { 
          ...(firstName && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(username !== undefined && { username }),
          ...(zoaBalance !== undefined && { zoaBalance }),
          ...(scratchChances !== undefined && { scratchChances })
        },
        create: {
          id: telegramId.toString(),
          telegramId: Number(telegramId),
          firstName: firstName || 'Anonymous',
          lastName: lastName || '',
          username: username || '',
          zoaBalance: zoaBalance || 0,
          scratchChances: scratchChances || 3,
          referralCode: `ZOA${telegramId}${Date.now().toString(36)}`.toUpperCase()
        }
      })

      console.log('[API] POST user - Upserted user:', user)
      return NextResponse.json(user)
    } catch (dbError: any) {
      console.error('[API] POST user - Database error:', dbError)
      return NextResponse.json(
        { error: 'Database operation failed', details: dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[API] POST user - Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}