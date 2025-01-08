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

// Client-side Pusher instance
let clientPusher: PusherClient | null = null;

if (typeof window !== 'undefined') {
  // Log the environment variables (temporary, for debugging)
  console.log('PUSHER_KEY:', process.env.NEXT_PUBLIC_PUSHER_KEY);
  console.log('PUSHER_CLUSTER:', process.env.NEXT_PUBLIC_PUSHER_CLUSTER);

  // Make sure we have the required values
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    console.error('Missing Pusher configuration');
  } else {
    try {
      clientPusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        authEndpoint: '/api/pusher/auth',
        auth: {
          headers: {
            'X-Telegram-WebApp-Data': window.Telegram?.WebApp?.initData || ''
          }
        }
      });
    } catch (error) {
      console.error('Error initializing Pusher client:', error);
    }
  }
}

export { clientPusher };