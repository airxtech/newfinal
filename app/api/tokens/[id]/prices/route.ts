// app/api/tokens/[id]/prices/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24H';

    // Calculate start time based on timeframe
    const now = new Date();
    let startTime = new Date();
    switch (timeframe) {
      case '1H':
        startTime.setHours(now.getHours() - 1);
        break;
      case '24H':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7D':
        startTime.setDate(now.getDate() - 7);
        break;
      case '1M':
        startTime.setMonth(now.getMonth() - 1);
        break;
      default:
        startTime.setDate(now.getDate() - 1);
    }

    // Get all transactions in the timeframe
    const transactions = await prisma.transaction.findMany({
      where: {
        tokenId: params.id,
        timestamp: {
          gte: startTime
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Group transactions by time intervals
    const intervals = timeframe === '1H' ? 60 : 100; // 60 points for 1H, 100 for others
    const timeInterval = (now.getTime() - startTime.getTime()) / intervals;
    
    const priceData: { timestamp: number; price: number; volume: number }[] = [];
    let currentInterval = startTime.getTime();

    for (let i = 0; i < intervals; i++) {
      const intervalEnd = currentInterval + timeInterval;
      
      const intervalTxs = transactions.filter(tx => 
        tx.timestamp.getTime() >= currentInterval && 
        tx.timestamp.getTime() < intervalEnd
      );

      if (intervalTxs.length > 0) {
        const lastPrice = intervalTxs[intervalTxs.length - 1].price;
        const volume = intervalTxs.reduce((sum, tx) => sum + tx.amount, 0);

        priceData.push({
          timestamp: currentInterval,
          price: lastPrice,
          volume
        });
      } else if (priceData.length > 0) {
        // Use last known price if no transactions in interval
        priceData.push({
          timestamp: currentInterval,
          price: priceData[priceData.length - 1].price,
          volume: 0
        });
      }

      currentInterval = intervalEnd;
    }

    return NextResponse.json(priceData);
  } catch (error) {
    console.error('Error fetching price data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price data' },
      { status: 500 }
    );
  }
}