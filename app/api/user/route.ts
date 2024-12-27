import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Remove the PrismaClient instantiation line
// const prisma = new PrismaClient()  <- Remove this line

export async function POST(request: Request) {
  console.log('POST request received')
  try {
    const body = await request.json()
    console.log('Request body:', body)
    
    const { telegramId, firstName, lastName, username, balance } = body
    console.log('Parsed data:', { telegramId, firstName, lastName, username, balance })

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
    
    console.log('Database response:', user)
    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Full error object:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Database operation failed', details: error.message },
      { status: 500 }
    )
  }
}