import {
  Table,
  Column,
  Model,
  ForeignKey,
  BelongsTo,
  DataType,
  PrimaryKey,
  Default
} from 'sequelize-typescript';
import { User } from 'src/user/user.entity';
import { Channel } from './channel.entity';

@Table({ timestamps: true })
export class ChannelAdmin extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4())
  @Column(DataType.UUID)
  public id: string;

  @ForeignKey(() => Channel)
  @Column(DataType.UUID)
  public channelId: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  public userId: string;

  @BelongsTo(() => Channel)
  public channel: Channel;

  @BelongsTo(() => User)
  public user: User;
}
