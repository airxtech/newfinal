// lib/services/pusherService.ts
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export const pusherClient = new PusherClient(
  process.env.PUSHER_KEY!, // This is still needed client-side
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
    auth: {
      headers: {
        'X-Telegram-WebApp-Data': window.Telegram?.WebApp?.initData || ''
      }
    }
  }
);