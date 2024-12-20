import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    const notification = this.notificationRepository.create({
      user,
      type,
      content,
      metadata,
      is_read: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Send real-time notification via WebSocket
    this.notificationsGateway.emitToUser(userId, {
      ...savedNotification,
      title: this.getNotificationTitle(type),
    });

    return savedNotification;
  }

  private getNotificationTitle(type: NotificationType): string {
    switch (type) {
      case 'message':
        return 'New Message';
      case 'friend_request':
        return 'Friend Request';
      case 'group_invite':
        return 'Group Invitation';
      case 'system':
        return 'System Notification';
      default:
        return 'New Notification';
    }
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        user: { user_id: userId },
        deleted_at: null,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findUnreadForUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        user: { user_id: userId },
        is_read: false,
        deleted_at: null,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        notification_id: notificationId,
        user: { user_id: userId },
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      {
        user: { user_id: userId },
        is_read: false,
        deleted_at: null,
      },
      {
        is_read: true,
      },
    );
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: {
        notification_id: notificationId,
        user: { user_id: userId },
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.deleted_at = new Date();
    await this.notificationRepository.save(notification);
  }

  // Helper methods for creating specific types of notifications
  async createMessageNotification(
    userId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string,
  ): Promise<Notification> {
    const content = `New message from ${senderName}: ${messagePreview}`;
    return this.create(userId, 'message', content, {
      conversation_id: conversationId,
      sender_name: senderName,
      message_preview: messagePreview,
    });
  }

  async createFriendRequestNotification(
    userId: string,
    senderName: string,
    senderId: string,
  ): Promise<Notification> {
    const content = `${senderName} sent you a friend request`;
    return this.create(userId, 'friend_request', content, {
      sender_id: senderId,
      sender_name: senderName,
    });
  }

  async createGroupInviteNotification(
    userId: string,
    senderName: string,
    groupName: string,
    conversationId: string,
  ): Promise<Notification> {
    const content = `${senderName} invited you to join ${groupName}`;
    return this.create(userId, 'group_invite', content, {
      conversation_id: conversationId,
      sender_name: senderName,
      group_name: groupName,
    });
  }
}
