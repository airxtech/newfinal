// lib/services/pusherService.ts
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const serverPusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance (only initialize if window exists)
let clientPusher: PusherClient | null = null;

if (typeof window !== 'undefined') {
  clientPusher = new PusherClient(
    process.env.PUSHER_KEY!,
    {
      cluster: process.env.PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'X-Telegram-WebApp-Data': window.Telegram?.WebApp?.initData || ''
        }
      }
    }
  );
}

export { clientPusher };