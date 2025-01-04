// lib/services/websocketService.ts
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createServer, Server as HTTPServer } from 'http'
import { prisma } from '../prisma'

interface SocketData {
  tokenId: string;
}

export class WebSocketService {
  private static instance: WebSocketService
  private io: SocketIOServer

  private constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST']
      }
    })

    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id)

      socket.on('subscribeToToken', (tokenId: string) => {
        socket.join(`token:${tokenId}`)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  public static init(httpServer: HTTPServer): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(httpServer)
    }
    return WebSocketService.instance
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      throw new Error('WebSocketService not initialized')
    }
    return WebSocketService.instance
  }

  public emitTokenUpdate(tokenId: string, data: Record<string, unknown>) {
    this.io.to(`token:${tokenId}`).emit('tokenUpdate', data)
  }
}