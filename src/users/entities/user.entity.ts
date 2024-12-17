import {
  Entity,
  Column,
  CreateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Friendship } from '../../friendships/entities/friendship.entity';
import { Message } from '../../messages/entities/message.entity';
import { ConversationMember } from '../../conversations/entities/conversation-member.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile_picture: string;

  @Column({ type: 'varchar', length: 20, default: 'offline' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Friendship, (friendship) => friendship.user)
  friendships: Friendship[];

  @OneToMany(() => Friendship, (friendship) => friendship.friend)
  friendOf: Friendship[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @OneToMany(() => ConversationMember, (member) => member.user)
  conversations: ConversationMember[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
