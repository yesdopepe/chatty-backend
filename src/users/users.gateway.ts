import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // In production, replace with your frontend URL
  },
})
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth.userId;
    if (!userId) return;

    // Add socket to user's set of connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client.id);

    // Update user status if this is their first connection
    if (this.userSockets.get(userId).size === 1) {
      await this.updateUserStatus(userId, 'online');
      this.broadcastUserStatus(userId, 'online');
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.auth.userId;
    if (!userId) return;

    // Remove socket from user's set of connections
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(client.id);

      // If user has no more active connections, mark them as offline
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
        await this.updateUserStatus(userId, 'offline');
        this.broadcastUserStatus(userId, 'offline');
      }
    }
  }

  private async updateUserStatus(userId: string, status: 'online' | 'offline') {
    await this.userRepository.update(userId, { status });
  }

  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    this.server.emit('userStatus', { userId, status });
  }

  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId).size > 0
    );
  }

  getUserSocketIds(userId: string): string[] {
    const socketSet = this.userSockets.get(userId);
    return socketSet ? Array.from(socketSet) : [];
  }
}
