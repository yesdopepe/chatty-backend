import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Extract token from Bearer format if present
      const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;

      // Verify and decode the token
      const payload = await this.jwtService.verifyAsync(tokenString);
      const userId = payload.sub;

      // Store user ID in socket data
      client.data.userId = userId;

      // Join user's notification room
      await client.join(`notification:${userId}`);

      // Send connection acknowledgment
      client.emit('notifications:connected', { status: 'connected' });
    } catch (error) {
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      client.leave(`notification:${userId}`);
    }
  }

  emitToUser(userId: string, notification: any) {
    this.server.to(`notification:${userId}`).emit('notification', notification);
  }
}
