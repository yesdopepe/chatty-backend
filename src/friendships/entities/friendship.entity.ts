import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('friendships')
export class Friendship {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  friend_id: number;

  @ManyToOne(() => User, (user) => user.friendships)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, (user) => user.friendOf)
  @JoinColumn({ name: 'friend_id' })
  friend: User;

  @Column({ type: 'varchar', length: 20 })
  status: 'pending' | 'accepted' | 'blocked';

  @CreateDateColumn()
  requested_at: Date;
}
