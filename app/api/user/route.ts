// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const userData = searchParams.get('userData')
    
    console.log('[API] GET user - telegramId:', telegramId)
    console.log('[API] GET user - userData:', userData)

    if (!telegramId) {
      console.log('[API] GET user - No telegramId provided')
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    try {
      // Parse user data if provided
      const parsedUserData = userData ? JSON.parse(userData) : null

      const user = await prisma.user.findUnique({
        where: { 
          telegramId: Number(telegramId) 
        }
      })

      console.log('[API] GET user - Found user:', user)
      
      if (!user) {
        console.log('[API] GET user - User not found, creating new user')
        const newUser = await prisma.user.create({
          data: {
            id: telegramId.toString(),
            telegramId: Number(telegramId),
            firstName: parsedUserData?.first_name || 'Anonymous',
            lastName: parsedUserData?.last_name || '',
            username: parsedUserData?.username || '',
            isPremium: parsedUserData?.is_premium || false,
            allowsPm: parsedUserData?.allows_write_to_pm || false,
            zoaBalance: 0,
            scratchChances: 3,
            lastChanceReset: new Date(),
            referralCode: `ZOA${telegramId}${Date.now().toString(36)}`.toUpperCase()
          }
        })

        console.log('[API] GET user - Created new user:', newUser)
        return NextResponse.json(newUser)
      }

      // Update existing user's Telegram data if provided
      if (parsedUserData) {
        const updatedUser = await prisma.user.update({
          where: { telegramId: Number(telegramId) },
          data: {
            firstName: parsedUserData.first_name,
            lastName: parsedUserData.last_name || '',
            username: parsedUserData.username || '',
            isPremium: parsedUserData.is_premium || false,
            allowsPm: parsedUserData.allows_write_to_pm || false
          }
        })
        return NextResponse.json(updatedUser)
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