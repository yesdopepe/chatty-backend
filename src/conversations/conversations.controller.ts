import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@Body() createConversationDto: CreateConversationDto, @Request() req) {
    return this.conversationsService.create(
      createConversationDto,
      req.user.sub,
    );
  }

  @Get()
  findAll(@Request() req) {
    return this.conversationsService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.conversationsService.findOne(id, req.user.sub);
  }

  @Post(':id/participants')
  addParticipants(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
    @Request() req,
  ) {
    if (!Array.isArray(userIds)) {
      throw new BadRequestException('userIds must be an array');
    }
    return this.conversationsService.addParticipants(id, userIds, req.user.sub);
  }

  @Post(':id/participants/:userId/remove')
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.conversationsService.removeParticipant(
      id,
      userId,
      req.user.sub,
    );
  }
}
