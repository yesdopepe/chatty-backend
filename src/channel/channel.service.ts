import { Injectable } from '@nestjs/common';
import { Message } from 'src/message/message.entity';
import { User } from 'src/user/user.entity';
import { Channel } from './channel.entity';
import { ChannelDto } from './dto/create-channel-dto';
import { ChannelParticipant } from './channel-participant.entity';
import { ChannelAdmin } from './channel-admin.entity';

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
        message: error,
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
