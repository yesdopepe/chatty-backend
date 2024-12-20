import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { User } from '../users/entities/user.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createConversationDto: CreateConversationDto,
    currentUserId: string,
  ): Promise<Conversation> {
    const { participant_ids, name, is_group } = createConversationDto;

    // Ensure current user is included in participants
    if (!participant_ids.includes(currentUserId)) {
      participant_ids.push(currentUserId);
    }

    // Get all participants
    const participants = await this.userRepository.findByIds(participant_ids);
    if (participants.length !== participant_ids.length) {
      throw new BadRequestException('One or more participants not found');
    }

    // For non-group chats, ensure only 2 participants
    if (!is_group && participants.length !== 2) {
      throw new BadRequestException(
        'Non-group conversations must have exactly 2 participants',
      );
    }

    // Check if a non-group conversation already exists between these users
    if (!is_group) {
      const existingConversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .innerJoinAndSelect('conversation.participants', 'participant')
        .where('conversation.is_group = :is_group', { is_group: false })
        .andWhere('participant.user_id IN (:...participant_ids)', {
          participant_ids,
        })
        .groupBy('conversation.conversation_id')
        .having('COUNT(DISTINCT participant.user_id) = :count', { count: 2 })
        .getOne();

      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create new conversation
    const conversation = this.conversationRepository.create({
      name: name || null,
      is_group: !!is_group,
      participants,
    });

    return this.conversationRepository.save(conversation);
  }

  async findAll(userId: string): Promise<Conversation[]> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.participants', 'participant')
      .where('participant.user_id = :userId', { userId })
      .getMany();
  }

  async findOne(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.participants', 'participant')
      .where('conversation.conversation_id = :conversationId', {
        conversationId,
      })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    if (!conversation.participants.some((p) => p.user_id === userId)) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async addParticipants(
    conversationId: string,
    userIds: string[],
    currentUserId: string,
  ): Promise<Conversation> {
    const conversation = await this.findOne(conversationId, currentUserId);

    if (!conversation.is_group) {
      throw new BadRequestException(
        'Cannot add participants to non-group conversation',
      );
    }

    const newParticipants = await this.userRepository.findByIds(userIds);
    if (newParticipants.length !== userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    conversation.participants.push(...newParticipants);
    return this.conversationRepository.save(conversation);
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    currentUserId: string,
  ): Promise<Conversation> {
    const conversation = await this.findOne(conversationId, currentUserId);

    if (!conversation.is_group) {
      throw new BadRequestException(
        'Cannot remove participants from non-group conversation',
      );
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.user_id !== userId,
    );
    return this.conversationRepository.save(conversation);
  }
}
