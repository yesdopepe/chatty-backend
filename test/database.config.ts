import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';
import { Friendship } from '../src/friendships/entities/friendship.entity';
import { Conversation } from '../src/conversations/entities/conversation.entity';
import { ConversationMember } from '../src/conversations/entities/conversation-member.entity';
import { Message } from '../src/messages/entities/message.entity';
import { Notification } from '../src/notifications/entities/notification.entity';
import { config } from 'dotenv';

config();

export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: 'chatty_test',
  entities: [
    User,
    Friendship,
    Conversation,
    ConversationMember,
    Message,
    Notification,
  ],
  synchronize: true,
  dropSchema: true,
  logging: false,
  uuidExtension: 'uuid-ossp',
};
