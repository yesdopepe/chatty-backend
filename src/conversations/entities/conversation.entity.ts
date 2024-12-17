import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  conversation_id: string;

  @Column({ type: 'boolean', default: false })
  is_group: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => ConversationMember, (member) => member.conversation)
  members: ConversationMember[];

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
