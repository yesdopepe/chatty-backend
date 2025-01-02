import { Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationGateway: NotificationGateway) {}

  async sendMessageNotification(message: any) {
    await this.notificationGateway.notifyNewMessage(message);
  }

  async sendFriendRequestNotification(request: any) {
    await this.notificationGateway.notifyFriendRequest(request);
  }

  async sendGroupMessageNotification(message: any, groupId: string) {
    await this.notificationGateway.notifyGroupMessage(message, groupId);
  }
}
