// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

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
      firstName,
      lastName,
      username
    } = body

    console.log('Attempting to create user with:', body) // Log the incoming data

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    // Try to create user
    try {
      const user = await prisma.user.create({
        data: {
          id: uuidv4(), // Make sure uuid is imported
          telegramId: Number(telegramId),
          firstName,
          lastName: lastName || '',
          username: username || '',
          zoaBalance: 0,
          referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
          lastChanceReset: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      return NextResponse.json(user)
    } catch (dbError: any) {
      console.error('Database operation details:', dbError) // Log the specific DB error
      return NextResponse.json(
        { error: 'Database operation failed', details: dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('POST request error details:', error)
    return NextResponse.json(
      { error: 'Request failed', details: error.message },
      { status: 500 }
    )
  }
}