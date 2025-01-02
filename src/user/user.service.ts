import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common/exceptions';
import { Op } from 'sequelize';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';
import { Friend } from './friend.entity';
import { BlockedUser } from './blocked-user.entity';

@Injectable()
export class UserService {
  async findByEmail(email: string): Promise<User | undefined> {
    const user = await User.findOne({ where: { email } });
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    return user;
  }

  async findBySearch(search: string): Promise<any> {
    const users = await User.findAll({ where: { username: { [Op.iLike]: `%${search}%` } } });
    return users;
  }

  async createUser({ email, username, password }: CreateUserDto): Promise<any> {
    const user = await User.create({
      email,
      username,
      password
    });
    return user;
  }

  async updateUser(user: any): Promise<any> {
    try {
      const updatedUser = await User.update(user, { where: { id: user.id } });
      return updatedUser;
    } catch {
      return {
        statusCode: '409',
        message: 'This username is already in use.'
      };
    }
  }

  async getFriends({ id }) {
    try {
      const friendships = await Friend.findAll({
        where: {
          userId: id,
          accepted: true
        },
        include: [{
          model: User,
          as: 'friend',
          attributes: { exclude: ['password'] }
        }]
      });

      return {
        statusCode: '200',
        friends: friendships.map(f => f.friend)
      };
    } catch (error) {
      return {
        statusCode: '404',
        message: 'Friends not found.'
      };
    }
  }

  async setFriend({ id, otherId, status }) {
    const firstUser = await this.findById(id);
    const secondUser = await this.findById(otherId);

    // Check if user exists
    if (!firstUser || !secondUser) throw new NotFoundException('User not found.');

    // Check if user is blocked
    const isBlocked = await BlockedUser.findOne({
      where: {
        [Op.or]: [
          { userId: id, blockedUserId: otherId },
          { userId: otherId, blockedUserId: id }
        ]
      }
    });

    if (isBlocked) {
      return {
        status: '406',
        message: 'You cannot do this. You are blocked.'
      };
    }

    // Check if users are already friends
    const existingFriendship = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId: id, friendId: otherId },
          { userId: otherId, friendId: id }
        ],
        accepted: true
      }
    });

    if (status && existingFriendship) {
      return {
        statusCode: '409',
        message: 'You are already friends.'
      };
    }

    if (status) {
      // Accept friend request
      await Friend.update(
        { accepted: true },
        {
          where: {
            userId: otherId,
            friendId: id,
            accepted: false
          }
        }
      );

      // Create reciprocal friendship
      await Friend.create({
        userId: id,
        friendId: otherId,
        accepted: true
      });
    } else {
      // Remove friendship
      await Friend.destroy({
        where: {
          [Op.or]: [
            { userId: id, friendId: otherId },
            { userId: otherId, friendId: id }
          ]
        }
      });
    }

    return {
      statusCode: '200',
      message: 'User updated successfully.'
    };
  }

  async getRequests({ id }) {
    try {
      const requests = await Friend.findAll({
        where: {
          friendId: id,
          accepted: false
        },
        include: [{
          model: User,
          as: 'user',
          attributes: { exclude: ['password'] }
        }]
      });

      return {
        statusCode: '200',
        requests: requests.map(r => r.user)
      };
    } catch {
      return {
        statusCode: '404',
        message: 'Requests not found.'
      };
    }
  }

  async setRequest({ id, otherId, status }) {
    const firstUser = await this.findById(id);
    const secondUser = await this.findById(otherId);

    // Check if user exists
    if (!firstUser || !secondUser) throw new NotFoundException('User not found.');

    // Check if user is blocked
    const isBlocked = await BlockedUser.findOne({
      where: {
        [Op.or]: [
          { userId: id, blockedUserId: otherId },
          { userId: otherId, blockedUserId: id }
        ]
      }
    });

    if (isBlocked) {
      return {
        status: '406',
        message: 'You cannot do this. You are blocked.'
      };
    }

    // Check if users are already friends
    const existingFriendship = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId: id, friendId: otherId },
          { userId: otherId, friendId: id }
        ],
        accepted: true
      }
    });

    if (existingFriendship) {
      return {
        statusCode: '406',
        message: 'You are already friends.'
      };
    }

    // Check if request already exists
    const existingRequest = await Friend.findOne({
      where: {
        userId: id,
        friendId: otherId,
        accepted: false
      }
    });

    if (status && existingRequest) {
      return {
        statusCode: '409',
        message: 'You already sent a request to this user.'
      };
    }

    if (status) {
      await Friend.create({
        userId: id,
        friendId: otherId,
        accepted: false
      });
    } else {
      await Friend.destroy({
        where: {
          userId: id,
          friendId: otherId,
          accepted: false
        }
      });
    }

    return {
      statusCode: '200',
      message: 'User updated successfully.'
    };
  }

  async getBlocked({ id }) {
    try {
      const blocked = await BlockedUser.findAll({
        where: { userId: id },
        include: [{
          model: User,
          as: 'blockedUser',
          attributes: { exclude: ['password'] }
        }]
      });

      return {
        statusCode: '200',
        blocked: blocked.map(b => b.blockedUser)
      };
    } catch {
      return {
        statusCode: '404',
        message: 'Blocked users not found.'
      };
    }
  }

  async setBlocked({ id, otherId, status }) {
    const firstUser = await this.findById(id);
    const secondUser = await this.findById(otherId);

    // Check if user exists
    if (!firstUser || !secondUser) throw new NotFoundException('User not found.');

    // Check if already blocked
    const existingBlock = await BlockedUser.findOne({
      where: {
        userId: id,
        blockedUserId: otherId
      }
    });

    if (status && existingBlock) {
      return {
        statusCode: '409',
        message: 'User is already blocked.'
      };
    }

    if (status) {
      // Remove any existing friendship
      await Friend.destroy({
        where: {
          [Op.or]: [
            { userId: id, friendId: otherId },
            { userId: otherId, friendId: id }
          ]
        }
      });

      // Block user
      await BlockedUser.create({
        userId: id,
        blockedUserId: otherId
      });
    } else {
      // Unblock user
      await BlockedUser.destroy({
        where: {
          userId: id,
          blockedUserId: otherId
        }
      });
    }

    return {
      statusCode: '200',
      message: 'User updated successfully.'
    };
  }
}
