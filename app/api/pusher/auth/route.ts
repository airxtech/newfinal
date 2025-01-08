// app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { pusher } from '@/lib/services/pusherService';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const headersList = headers();
  const webAppData = headersList.get('X-Telegram-WebApp-Data');
  
  // Verify Telegram WebApp data
  if (!webAppData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Get the channel name from request
  const { channel_name, socket_id } = await request.json();

  try {
    // Generate auth signature
    const authResponse = pusher.authorizeChannel(socket_id, channel_name);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: 'Failed to authorize channel' },
      { status: 500 }
    );
  }
}