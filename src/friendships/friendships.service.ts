import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';
import { SearchFriendsDto } from './dto/search-friends.dto';

@Injectable()
export class FriendshipsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async searchFriends(userId: number, searchDto: SearchFriendsDto) {
    const { search, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.friendshipRepository
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.friend', 'friend')
      .where('friendship.user_id = :userId', { userId })
      .andWhere('friendship.status = :status', { status: 'accepted' });

    if (search) {
      queryBuilder.andWhere('friend.username LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [friends, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: friends,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendFriendRequest(userId: number, friendId: number) {
    if (userId === friendId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId },
      ],
    });

    if (existingFriendship) {
      throw new BadRequestException('Friendship already exists');
    }

    const friend = await this.userRepository.findOne({
      where: { user_id: friendId },
    });
    if (!friend) {
      throw new NotFoundException('User not found');
    }

    // Check if the user is blocked
    const existingBlock = await this.friendshipRepository.findOne({
      where: [{ user_id: friendId, friend_id: userId, status: 'blocked' }],
    });

    if (existingBlock) {
      throw new BadRequestException(
        'Cannot send friend request to a user who has blocked you',
      );
    }

    const friendship = this.friendshipRepository.create({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
    });

    return this.friendshipRepository.save(friendship);
  }

  async acceptFriendRequest(userId: number, friendId: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: { user_id: friendId, friend_id: userId, status: 'pending' },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    friendship.status = 'accepted';
    return this.friendshipRepository.save(friendship);
  }

  async blockUser(userId: number, friendId: number) {
    let friendship = await this.friendshipRepository.findOne({
      where: [
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId },
      ],
    });

    if (friendship) {
      // If friendship exists, update it to blocked
      friendship.status = 'blocked';
      friendship.user_id = userId;
      friendship.friend_id = friendId;
    } else {
      // Create new blocked relationship
      friendship = this.friendshipRepository.create({
        user_id: userId,
        friend_id: friendId,
        status: 'blocked',
      });
    }

    return this.friendshipRepository.save(friendship);
  }

  async unblockUser(userId: number, friendId: number) {
    const friendship = await this.friendshipRepository.findOne({
      where: { user_id: userId, friend_id: friendId, status: 'blocked' },
    });

    if (!friendship) {
      throw new NotFoundException('Blocked relationship not found');
    }

    await this.friendshipRepository.remove(friendship);
    return { message: 'User unblocked successfully' };
  }

  async getFriendSuggestions(userId: number, limit: number = 5) {
    // First, get all accepted friendships for the user
    const userFriends = await this.friendshipRepository.find({
      where: [
        { user_id: userId, status: 'accepted' },
        { friend_id: userId, status: 'accepted' },
      ],
    });

    // Get IDs of all current friends
    const friendIds = userFriends.map((f) =>
      f.user_id === userId ? f.friend_id : f.user_id,
    );

    // Get friends of friends
    const friendsOfFriends = await this.friendshipRepository
      .createQueryBuilder('f')
      .select(
        'DISTINCT CASE ' +
          'WHEN f.user_id = ANY(:friendIds) THEN f.friend_id ' +
          'ELSE f.user_id END',
        'suggested_id',
      )
      .where('(f.user_id = ANY(:friendIds) OR f.friend_id = ANY(:friendIds))')
      .andWhere('f.status = :status', { status: 'accepted' })
      .andWhere('f.user_id != :userId', { userId })
      .andWhere('f.friend_id != :userId', { userId })
      .setParameter('friendIds', friendIds)
      .limit(limit)
      .getRawMany();

    const suggestionIds = friendsOfFriends
      .map((f) => f.suggested_id)
      .filter((id) => !friendIds.includes(id) && id !== userId);

    if (suggestionIds.length === 0) {
      return [];
    }

    return this.userRepository.find({
      where: { user_id: In(suggestionIds) },
      select: ['user_id', 'username', 'email', 'profile_picture', 'status'],
    });
  }
}
