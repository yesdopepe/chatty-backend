export enum NotificationType {
    MESSAGE = 'message',
    FRIEND_REQUEST = 'friend_request',
    GROUP_INVITE = 'group_invite',
    SYSTEM = 'system',
  }
export interface NotificationPayload {
    title: string;
    body: string;
    type: NotificationType;
    metadata?: Record<string, any>;
  }
  
  export interface DeviceRegistration {
    userId: string;
    deviceToken: string;
  }