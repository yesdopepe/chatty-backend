import {
  Entity,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryColumn('uuid')
  conversation_id: string;

  @PrimaryColumn('uuid')
  user_id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.members)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.conversations)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  joined_at: Date;
}
