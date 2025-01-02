import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageService } from '../message/message.service';
import { UserService } from '../user/user.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(JwtAuthGuard)
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly messageService: MessageService,
    private readonly userService: UserService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  async notifyNewMessage(message: any) {
    const recipientId = message.recipientId;
    const recipientSockets = this.userSockets.get(recipientId);
    if (recipientSockets) {
      recipientSockets.forEach(socketId => {
        this.server.to(socketId).emit('newMessage', {
          type: 'message',
          data: message,
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  async notifyFriendRequest(request: any) {
    const recipientId = request.recipientId;
    const recipientSockets = this.userSockets.get(recipientId);
    if (recipientSockets) {
      recipientSockets.forEach(socketId => {
        this.server.to(socketId).emit('friendRequest', {
          type: 'friendRequest',
          data: request,
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  async notifyGroupMessage(message: any, groupId: string) {
    this.server.to(`group_${groupId}`).emit('newGroupMessage', {
      type: 'groupMessage',
      data: message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(client: Socket, groupId: string) {
    client.join(`group_${groupId}`);
  }

  @SubscribeMessage('leaveGroup')
  async handleLeaveGroup(client: Socket, groupId: string) {
    client.leave(`group_${groupId}`);
  }
}
