import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { User } from './entities/user.entity';
import { SearchUsersDto } from './dto/search-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async searchUsers(currentUserId: string, searchDto: SearchUsersDto) {
    const { search, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.user_id != :currentUserId', { currentUserId });

    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await queryBuilder
      .select([
        'user.user_id',
        'user.username',
        'user.email',
        'user.profile_picture',
        'user.status',
      ])
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
