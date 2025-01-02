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
import { User } from './user.entity';

@Table({ timestamps: true })
export class Friend extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4())
  @Column(DataType.UUID)
  public id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  public userId: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  public friendId: string;

  @BelongsTo(() => User, 'userId')
  public user: User;

  @BelongsTo(() => User, 'friendId')
  public friend: User;

  @Column(DataType.BOOLEAN)
  public accepted: boolean;
}
