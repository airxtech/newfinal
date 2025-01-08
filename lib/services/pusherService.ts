// lib/services/pusherService.ts
// lib/services/pusherService.ts
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const serverPusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!, // Changed from PUSHER_KEY
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance
let clientPusher: PusherClient | null = null;

if (typeof window !== 'undefined') {
  try {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.error('Pusher configuration missing:', {
        key: process.env.NEXT_PUBLIC_PUSHER_KEY,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      });
    } else {
      clientPusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        forceTLS: true
      });
    }
  } catch (error) {
    console.error('Error initializing Pusher client:', error);
  }
}

export { clientPusher };