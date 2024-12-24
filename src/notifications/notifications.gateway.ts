import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// Define the structure of our notification payload
interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, any>;
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
  pingInterval: 10000, // Send ping every 10 seconds
  pingTimeout: 5000,   // Consider connection dead if no pong within 5 seconds
})
@UseGuards(JwtAuthGuard)
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  
  // Track active connections with user information
  private readonly connections = new Map<string, Set<string>>();  // userId -> Set of socket IDs

  afterInit(server: Server) {
    this.logger.log('Notification WebSocket Gateway initialized');
    
    // Setup middleware for authentication
    server.use((socket, next) => {
      // Here you would verify the token from socket.handshake.auth
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      // Verify token and attach user data to socket
      // socket.data.userId = decoded.userId;
      next();
    });
  }

  handleConnection(socket: Socket) {
    // Get user ID from socket data (set in middleware)
    const userId = socket.data.userId;
    this.logger.log(`Client connected: ${socket.id} for user: ${userId}`);

    // Add socket to user's room
    socket.join(`user:${userId}`);

    // Track connection
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(socket.id);

    // Send connection status to client
    socket.emit('connection_status', {
      status: 'connected',
      socketId: socket.id,
      timestamp: new Date(),
    });
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    this.logger.log(`Client disconnected: ${socket.id} for user: ${userId}`);

    // Remove socket from tracking
    const userSockets = this.connections.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.connections.delete(userId);
      }
    }

    // Leave all rooms
    socket.rooms.forEach(room => socket.leave(room));
  }

  @SubscribeMessage('register_device')
  async handleDeviceRegistration(
    socket: Socket,
    payload: { deviceToken: string }
  ) {
    const userId = socket.data.userId;
    const { deviceToken } = payload;

    // Add device-specific room
    socket.join(`device:${deviceToken}`);

    this.logger.log(`Device registered for user ${userId}: ${deviceToken}`);

    // Acknowledge registration
    return {
      status: 'success',
      deviceToken,
      timestamp: new Date(),
    };
  }

  async sendNotificationToUser(
    userId: string,
    notification: NotificationPayload
  ): Promise<boolean> {
    // Check if user has any active connections
    if (!this.connections.has(userId)) {
      this.logger.warn(`No active connections for user: ${userId}`);
      return false;
    }

    try {
      // Emit to user's room with acknowledgment
      const response = await this.server
        .to(`user:${userId}`)
        .timeout(5000) // Wait up to 5 seconds for acknowledgment
        .emitWithAck('notification', {
          ...notification,
          timestamp: new Date(),
          id: Math.random().toString(36).substr(2, 9), // Generate unique ID
        });

      this.logger.log(`Notification sent to user ${userId}: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification to user ${userId}:`, error);
      return false;
    }
  }

  // Send notification to a specific device
  async sendNotificationToDevice(
    deviceToken: string,
    notification: NotificationPayload
  ): Promise<boolean> {
    try {
      const response = await this.server
        .to(`device:${deviceToken}`)
        .timeout(5000)
        .emitWithAck('notification', {
          ...notification,
          timestamp: new Date(),
          id: Math.random().toString(36).substr(2, 9),
        });

      this.logger.log(`Notification sent to device ${deviceToken}: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification to device ${deviceToken}:`, error);
      return false;
    }
  }

  // Get count of active connections for a user
  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size ?? 0;
  }

  // Broadcast system notification to all connected clients
  async broadcastSystemNotification(notification: NotificationPayload): Promise<void> {
    this.server.emit('system_notification', {
      ...notification,
      timestamp: new Date(),
      id: Math.random().toString(36).substr(2, 9),
    });
  }
}