import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // In production, replace with your frontend URL
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtStrategy: JwtStrategy) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Extract token from Bearer format if present
      const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;

      // Use the JWT strategy to validate the token and get the user
      const user = await this.jwtStrategy.validate({ sub: tokenString });
      const userId = user.user_id;

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
