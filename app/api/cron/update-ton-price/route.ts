// app/api/cron/update-ton-price/route.ts
import { NextResponse } from 'next/server';
import { TonPriceService } from '@/lib/services/tonPriceService';
import { headers } from 'next/headers';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

export async function GET(request: Request) {
  const headersList = headers();
  const authHeader = headersList.get('Authorization');

  // Verify the cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
      statusText: 'Unauthorized'
    });
  }

  try {
    // Update TON price
    const price = await TonPriceService.updatePrice();

    // If using Pusher, broadcast the new price
    if (price) {
      await pusher.trigger('ton-price', 'price-update', {
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