// app/api/tasks/complete/route.ts
import { prisma } from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
      const body = await request.json()
      const { telegramId, taskId, reward } = body
  
      // Update user task completion and balance
      const newTask = {
        id: uuidv4(), // Generate a unique task ID
        taskId, // Use the actual taskId
        completed: true,
        completedAt: new Date(),
        // Include any other required properties here
      };

      const user = await prisma.user.update({
        where: { telegramId: Number(telegramId) },
        data: {
          zoaBalance: { increment: reward },
          tasks: {
            create: newTask
          }
        },
        include: {
          tasks: true
        }
      })
  
      return NextResponse.json(user)
    } catch (error: any) {
      console.error('Complete task error:', error)
      return NextResponse.json(
        { error: 'Failed to complete task' },
        { status: 500 }
      )
    }
  }