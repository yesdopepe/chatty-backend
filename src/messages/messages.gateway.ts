import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, replace with your frontend URL
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(private readonly messagesService: MessagesService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (userId) {
      this.userSockets.set(userId, client.id);
      this.socketUsers.set(client.id, userId);

      // Notify others that user is online
      this.server.emit('userStatus', { userId, status: 'online' });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(client.id);

      // Notify others that user is offline
      this.server.emit('userStatus', { userId, status: 'offline' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    try {
      const message = await this.messagesService.create(
        createMessageDto,
        userId,
      );

      // Emit message to all participants in the conversation
      const conversation = message.conversation;
      conversation.participants.forEach((participant) => {
        const socketId = this.userSockets.get(participant.user_id);
        if (socketId) {
          this.server.to(socketId).emit('newMessage', message);
        }
      });

      return message;
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    // Emit typing status to all participants except the sender
    this.server.to(data.conversationId).emit('userTyping', {
      userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.join(conversationId);
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.leave(conversationId);
  }

  // Helper method to emit message status updates
  async emitMessageStatus(
    messageId: string,
    userId: string,
    status: 'delivered' | 'read',
  ) {
    const message = await this.messagesService.updateStatus(
      messageId,
      userId,
      status,
    );

    // Emit status update to sender
    const senderSocketId = this.userSockets.get(message.sender.user_id);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('messageStatus', {
        messageId,
        userId,
        status,
      });
    }
  }
}
