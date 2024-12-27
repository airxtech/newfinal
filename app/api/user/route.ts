// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, firstName, lastName, username, balance } = body
    
    const user = await prisma.user.upsert({
      where: { telegramId },
      update: { balance },
      create: {
        id: telegramId.toString(),
        telegramId,
        firstName,
        lastName,
        username,
        balance
      }
    })
    
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
