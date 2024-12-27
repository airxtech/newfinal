// app/api/tasks/daily/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        isDaily: true,
        isActive: true
      }
    })
    
    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('GET daily tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily tasks' },
      { status: 500 }
    )
  }
}