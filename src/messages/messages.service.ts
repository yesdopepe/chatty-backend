import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    createMessageDto: CreateMessageDto,
    senderId: string,
  ): Promise<Message> {
    const { content, conversation_id } = createMessageDto;

    // Get sender
    const sender = await this.userRepository.findOne({
      where: { user_id: senderId },
    });
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Get conversation and verify sender is a participant
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.participants', 'participant')
      .where('conversation.conversation_id = :conversation_id', {
        conversation_id,
      })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.participants.some((p) => p.user_id === senderId)) {
      throw new BadRequestException(
        'User is not a participant in this conversation',
      );
    }

    // Create message
    const message = this.messageRepository.create({
      content,
      sender,
      conversation,
      status: 'sent',
    });

    const savedMessage = await this.messageRepository.save(message);

    // Create notifications for other participants
    const messagePreview =
      content.length > 50 ? `${content.substring(0, 47)}...` : content;
    const otherParticipants = conversation.participants.filter(
      (p) => p.user_id !== senderId,
    );

    await Promise.all(
      otherParticipants.map((participant) =>
        this.notificationsService.createMessageNotification(
          participant.user_id,
          sender.username,
          messagePreview,
          conversation_id,
        ),
      ),
    );

    return savedMessage;
  }

  async findByConversation(
    conversationId: string,
    userId: string,
  ): Promise<Message[]> {
    // Verify user is a participant
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.participants', 'participant')
      .where('conversation.conversation_id = :conversationId', {
        conversationId,
      })
      .getOne();

    if (
      !conversation ||
      !conversation.participants.some((p) => p.user_id === userId)
    ) {
      throw new NotFoundException('Conversation not found');
    }

    return this.messageRepository
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.deleted_at IS NULL')
      .orderBy('message.created_at', 'ASC')
      .getMany();
  }

  async updateStatus(
    messageId: string,
    userId: string,
    status: MessageStatus,
  ): Promise<Message> {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.conversation', 'conversation')
      .innerJoinAndSelect('conversation.participants', 'participant')
      .where('message.message_id = :messageId', { messageId })
      .getOne();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is a participant
    if (!message.conversation.participants.some((p) => p.user_id === userId)) {
      throw new NotFoundException('Message not found');
    }

    message.status = status;
    return this.messageRepository.save(message);
  }

  async editMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<Message> {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.message_id = :messageId', { messageId })
      .getOne();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the sender
    if (message.sender.user_id !== userId) {
      throw new BadRequestException('Only the sender can edit the message');
    }

    message.content = content;
    message.is_edited = true;
    return this.messageRepository.save(message);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.message_id = :messageId', { messageId })
      .getOne();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the sender
    if (message.sender.user_id !== userId) {
      throw new BadRequestException('Only the sender can delete the message');
    }

    message.deleted_at = new Date();
    await this.messageRepository.save(message);
  }
}
