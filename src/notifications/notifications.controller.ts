import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.notificationsService.findAllForUser(req.user.sub);
  }

  @Get('unread')
  async findUnread(@Request() req) {
    return this.notificationsService.findUnreadForUser(req.user.sub);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    try {
      return await this.notificationsService.markAsRead(id, req.user.sub);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    try {
      await this.notificationsService.delete(id, req.user.sub);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}
