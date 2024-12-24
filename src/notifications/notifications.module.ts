import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
  ],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
