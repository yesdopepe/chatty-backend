import { Injectable } from '@nestjs/common';
import { Message } from 'src/message/message.entity';
import { User } from 'src/user/user.entity';
import { Channel } from './channel.entity';
import { ChannelDto } from './dto/create-channel-dto';
import { ChannelParticipant } from './channel-participant.entity';
import { ChannelAdmin } from './channel-admin.entity';
import { BlockedUser } from 'src/user/blocked-user.entity';

@Injectable()
export class ChannelService {
  async getChannel(id: string) {
    try {
      const channel = await Channel.findByPk(id, {
        include: [
          {
            model: ChannelParticipant,
            include: [
              {
                model: User,
                attributes: { exclude: ['password', 'email'] },
              },
            ],
          },
          {
            model: ChannelAdmin,
            include: [
              {
                model: User,
                attributes: { exclude: ['password', 'email'] },
              },
            ],
          },
        ],
      });

      if (!channel) {
        throw new Error('Channel not found');
      }

      const participants = channel.participants.map((p) => p.user);
      const admins = channel.admins.map((a) => a.user);

      return {
        ...channel.toJSON(),
        participants,
        admins,
        image: channel.isGroup ? channel.image : participants[1]?.image,
      };
    } catch {
      return {
        statusCode: '404',
        message: 'Channel not found.',
      };
    }
  }

  async getChannelsByUser(userId: string) {
    try {
      const channelParticipations = await ChannelParticipant.findAll({
        where: { userId },
        include: [
          {
            model: Channel,
            include: [
              {
                model: ChannelParticipant,
                include: [
                  {
                    model: User,
                    attributes: { exclude: ['password', 'email'] },
                  },
                ],
              },
              {
                model: ChannelAdmin,
                include: [
                  {
                    model: User,
                    attributes: { exclude: ['password', 'email'] },
                  },
                ],
              },
            ],
            order: [['updatedAt', 'DESC']],
          },
        ],
      });

      const formattedChannels = channelParticipations.map((cp) => {
        const channel = cp.channel;
        const participants = channel.participants.map((p) => p.user);
        const admins = channel.admins.map((a) => a.user);

        // For direct messages, find the other user (not the current user)
        const otherUser = channel.isGroup
          ? null
          : participants.find((p) => p.id !== userId);

        return {
          ...channel.toJSON(),
          participants,
          admins,
          image: channel.isGroup ? channel.image : otherUser?.image,
          name: channel.isGroup ? channel.name : otherUser?.username,
        };
      });

      const lastMessages = await Promise.all(
        formattedChannels.map((channel) =>
          Message.findOne({
            where: { channelId: channel.id },
            order: [['createdAt', 'DESC']],
          }),
        ),
      );

      return {
        channels: formattedChannels,
        lastMessages,
      };
    } catch (error) {
      return {
        statusCode: '404',
        message: 'User or channel not found.',
      };
    }
  }

  private async findExistingDMChannel(user1Id: string, user2Id: string) {
    const channels = await Channel.findAll({
      where: { isGroup: false },
      include: [
        {
          model: ChannelParticipant,
          include: [
            {
              model: User,
              attributes: { exclude: ['password', 'email'] },
            },
          ],
        },
      ],
    });

    return channels.find((channel) => {
      const participantIds = channel.participants.map((p) => p.user.id);
      return (
        participantIds.includes(user1Id) && participantIds.includes(user2Id)
      );
    });
  }

  async createChannel({
    participants,
    admins,
    image,
    name,
    description,
    isGroup,
  }: ChannelDto) {
    try {
      // Validate participant count based on isGroup
      if (isGroup && participants.length < 3) {
        throw new Error('Group channels must have at least 3 participants');
      }
      if (!isGroup && participants.length !== 2) {
        throw new Error('Direct channels must have exactly 2 participants');
      }

      // Check for blocks in DM channels
      if (!isGroup) {
        const [user1Id, user2Id] = participants;
        const block = await BlockedUser.findOne({
          where: {
            $or: [
              { userId: user1Id, blockedUserId: user2Id },
              { userId: user2Id, blockedUserId: user1Id },
            ],
          },
        });

        if (block) {
          throw new Error(
            'Cannot create channel: one of the users has blocked the other',
          );
        }
      }

      // Check for blocks in group channels between participants and the creator
      if (isGroup && admins?.length > 0) {
        const creatorId = admins[0]; // First admin is considered the creator
        const blocks = await BlockedUser.findOne({
          where: {
            $or: [
              { userId: creatorId, blockedUserId: { $in: participants } },
              { userId: { $in: participants }, blockedUserId: creatorId },
            ],
          },
        });

        if (blocks) {
          throw new Error(
            'Cannot create group: there is a block between the creator and a participant',
          );
        }
      }

      // Check for existing DM channel if this is not a group
      if (!isGroup) {
        const existingChannel = await this.findExistingDMChannel(
          participants[0],
          participants[1],
        );
        if (existingChannel) {
          return {
            statusCode: '400',
            message:
              'Direct message channel already exists between these users',
            channel: existingChannel,
          };
        }
      }

      const channel = await Channel.create({
        image,
        name,
        description,
        isGroup,
      });

      // Add participants
      await Promise.all(
        participants.map((userId) =>
          ChannelParticipant.create({
            channelId: channel.id,
            userId,
          }),
        ),
      );

      // Add admins
      if (admins && admins.length > 0) {
        await Promise.all(
          admins.map((userId) =>
            ChannelAdmin.create({
              channelId: channel.id,
              userId,
            }),
          ),
        );
      }

      return {
        statusCode: '201',
        message: 'Channel created successfully.',
        channel,
      };
    } catch (error) {
      return {
        status: '400',
        message: error.message || error,
      };
    }
  }

  async updateChannel({ id, channel }) {
    try {
      const { participants, admins, ...channelData } = channel;

      await Channel.update(channelData, { where: { id } });

      if (participants) {
        // Remove old participants
        await ChannelParticipant.destroy({ where: { channelId: id } });

        // Add new participants
        await Promise.all(
          participants.map((userId) =>
            ChannelParticipant.create({
              channelId: id,
              userId,
            }),
          ),
        );
      }

      if (admins) {
        // Remove old admins
        await ChannelAdmin.destroy({ where: { channelId: id } });

        // Add new admins
        await Promise.all(
          admins.map((userId) =>
            ChannelAdmin.create({
              channelId: id,
              userId,
            }),
          ),
        );
      }

      return {
        statusCode: '200',
        message: 'Channel updated successfully.',
      };
    } catch {
      return {
        statusCode: '404',
        message: 'Channel not found.',
      };
    }
  }

  async deleteChannel(id: string) {
    try {
      // Delete all related records first
      await ChannelParticipant.destroy({ where: { channelId: id } });
      await ChannelAdmin.destroy({ where: { channelId: id } });
      await Message.destroy({ where: { channelId: id } });

      // Delete the channel
      await Channel.destroy({ where: { id } });

      return {
        statusCode: '200',
        message: 'Channel deleted successfully.',
      };
    } catch {
      return {
        statusCode: '404',
        message: 'Channel not found.',
      };
    }
  }
}
