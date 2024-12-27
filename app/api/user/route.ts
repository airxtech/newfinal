// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, firstName, lastName, username, balance } = body
    
    console.log('Received request:', { telegramId, firstName, lastName, username, balance })

    const user = await prisma.user.upsert({
      where: { 
        telegramId: Number(telegramId) 
      },
      update: { 
        firstName,
        lastName,
        username,
        balance: balance || 0
      },
      create: {
        id: telegramId.toString(),
        telegramId: Number(telegramId),
        firstName,
        lastName: lastName || '',
        username: username || '',
        balance: balance || 0
      }
    })
    
    console.log('User saved/updated:', user)
    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Database operation failed:', error)
    return NextResponse.json(
      { error: 'Database operation failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const telegramId = url.searchParams.get('telegramId')
    
    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { 
        telegramId: Number(telegramId) 
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
    console.error('Database query failed:', error)
    return NextResponse.json(
      { error: 'Database query failed', details: error.message },
      { status: 500 }
    )
  }
}