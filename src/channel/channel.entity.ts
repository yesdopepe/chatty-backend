import { Column, DataType, Default, Model, PrimaryKey, Table, HasMany } from 'sequelize-typescript';
import { Message } from 'src/message/message.entity';
import { ChannelParticipant } from './channel-participant.entity';
import { ChannelAdmin } from './channel-admin.entity';

@Table({ timestamps: true })
export class Channel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4())
  @Column(DataType.UUID)
  public id: string;

  @Column(DataType.STRING)
  public description: string;

  @Column(DataType.STRING(50))
  public name: string;

  @Column(DataType.STRING)
  public image: string;

  @HasMany(() => ChannelParticipant)
  public participants: ChannelParticipant[];

  @HasMany(() => ChannelAdmin)
  public admins: ChannelAdmin[];

  @HasMany(() => Message)
  public messages: Message[];
}
