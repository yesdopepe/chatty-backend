import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus } from './entities/message.entity';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    return this.messagesService.create(createMessageDto, req.user.sub);
  }

  @Get('conversation/:conversationId')
  findByConversation(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    return this.messagesService.findByConversation(
      conversationId,
      req.user.sub,
    );
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: MessageStatus,
    @Request() req,
  ) {
    return this.messagesService.updateStatus(id, req.user.sub, status);
  }

  @Put(':id')
  editMessage(
    @Param('id') id: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    return this.messagesService.editMessage(id, req.user.sub, content);
  }

  @Delete(':id')
  deleteMessage(@Param('id') id: string, @Request() req) {
    return this.messagesService.deleteMessage(id, req.user.sub);
  }
}
