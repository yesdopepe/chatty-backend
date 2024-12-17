import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  notification_id: string;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  type: 'new_message' | 'friend_request' | string;

  @Column({ type: 'varchar', length: 255 })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;
}
