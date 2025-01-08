// app/api/pusher/auth/route.ts
import { NextResponse } from 'next/server';
import { serverPusher } from '@/lib/services/pusherService';
import { headers } from 'next/headers';
import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN || '';

function validateTelegramWebAppData(data: string, botToken: string) {
  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const signature = crypto
    .createHmac('sha256', secret.toString('hex'))
    .update(data)
    .digest('hex');

  return signature;
}

export async function POST(request: Request) {
  try {
    // Get Telegram WebApp data from header
    const headersList = headers();
    const webAppData = headersList.get('x-telegram-webapp-data');

    // Verify Telegram WebApp data
    if (!webAppData) {
      return new NextResponse('Unauthorized: No WebApp data', { status: 401 });
    }

    // Parse the init data
    const parsedInitData = Object.fromEntries(new URLSearchParams(webAppData));
    const hash = parsedInitData.hash;

    // Remove hash from data before validation
    const dataToValidate = Object.entries(parsedInitData)
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const generatedHash = validateTelegramWebAppData(dataToValidate, BOT_TOKEN);

    if (generatedHash !== hash) {
      return new NextResponse('Unauthorized: Invalid hash', { status: 401 });
    }

    // Get Pusher data from request
    const body = await request.json();
    const { socket_id, channel_name } = body;

    // Verify channel name format
    if (!channel_name.startsWith('private-')) {
      return new NextResponse('Invalid channel', { status: 400 });
    }

    // Generate auth signature
    const auth = serverPusher.authorizeChannel(socket_id, channel_name);

    return NextResponse.json(auth);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}