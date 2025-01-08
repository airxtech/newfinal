// app/api/cron/update-ton-price/route.ts
import { NextResponse } from 'next/server';
import { TonPriceService } from '@/lib/services/tonPriceService';
import { pusher } from '@/lib/services/pusherService';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  const headersList = headers();
  const authHeader = headersList.get('Authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
      statusText: 'Unauthorized'
    });
  }

  try {
    // Update TON price
    const price = await TonPriceService.updatePrice();

    // After successfully updating the price, broadcast it via Pusher
    if (price) {
      // Broadcast to a general ton-price channel instead of token-specific
      await pusher.trigger('private-ton-price', 'price-update', {
        price,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      price,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating TON price:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update TON price'
    }, { status: 500 });
  }
}