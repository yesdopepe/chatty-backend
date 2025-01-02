import { Sequelize } from 'sequelize-typescript';
import { Channel } from 'src/channel/channel.entity';
import { ChannelAdmin } from 'src/channel/channel-admin.entity';
import { ChannelParticipant } from 'src/channel/channel-participant.entity';
import { Message } from 'src/message/message.entity';
import { User } from 'src/user/user.entity';
import { Friend } from 'src/user/friend.entity';
import { BlockedUser } from 'src/user/blocked-user.entity';

export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: 'localhost',
        port: 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
      sequelize.addModels([
        User,
        Channel,
        Message,
        Friend,
        BlockedUser,
        ChannelParticipant,
        ChannelAdmin,
      ]);
      await sequelize.sync({ alter: true });
      return sequelize;
    },
  },
];
