// app/api/tokens/[id]/holders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const holders = await prisma.userToken.findMany({
      where: {
        tokenId: params.id,
        balance: { gt: 0 }
      },
      include: {
        user: {
          select: {
            username: true,
            firstName: true
          }
        }
      }
    });

    // Calculate total token supply
    const totalTokens = holders.reduce((sum, holder) => sum + holder.balance, 0);

    const formattedHolders = holders.map(holder => ({
      address: holder.user.username || holder.userId,
      amount: holder.balance,
      percentage: (holder.balance / totalTokens) * 100,
      isDev: false, // Set based on your criteria
      user: {
        username: holder.user.username,
        firstName: holder.user.firstName
      }
    }));

    return NextResponse.json(formattedHolders);
  } catch (error) {
    console.error('Error fetching holders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holders' },
      { status: 500 }
    );
  }
}