import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from './types/notifications.types';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private notificationGateway: NotificationsGateway
  ) {}

  async createAndSendNotification(
    userId: string,
    type: NotificationType,
    content: string,
    metadata?: Record<string, any>
  ) {
    // Create database record
    const notification = this.notificationRepo.create({
      user: { user_id: userId },
      type,
      content,
      metadata,
      is_read: false
    });

    // Save to database
    await this.notificationRepo.save(notification);

    // Prepare real-time notification payload
    const payload = {
      title: this.getTypeTitle(type),
      body: content,
      type,
      metadata: {
        ...metadata,
        notification_id: notification.notification_id
      }
    };

    // Attempt real-time delivery
    const delivered = await this.notificationGateway.sendNotificationToUser(
      userId,
      payload
    );

    return {
      notification,
      delivered,
      activeConnections: this.notificationGateway.getUserConnectionCount(userId)
    };
  }

  private getTypeTitle(type: NotificationType): string {
    const titles = {
      message: 'New Message',
      friend_request: 'New Friend Request',
      group_invite: 'Group Invitation',
      system: 'System Notification'
    };
    return titles[type] || 'Notification';
  }
}