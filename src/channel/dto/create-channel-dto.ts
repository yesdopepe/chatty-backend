export class ChannelDto {
  isGroup?: boolean;
  participants: string[];
  admins?: string[];
  image?: string;
  name?: string;
  description?: string;
}
