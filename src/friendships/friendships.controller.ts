import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendRequestDto } from './dto/friend-request.dto';
import { SearchFriendsDto } from './dto/search-friends.dto';

@Controller('friendships')
@UseGuards(JwtAuthGuard)
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get('search')
  async searchFriends(@Request() req, @Query() searchDto: SearchFriendsDto) {
    return this.friendshipsService.searchFriends(req.user.user_id, searchDto);
  }

  @Post('request')
  async sendFriendRequest(
    @Request() req,
    @Body() friendRequestDto: FriendRequestDto,
  ) {
    return this.friendshipsService.sendFriendRequest(
      req.user.user_id,
      friendRequestDto.friendId,
    );
  }

  @Post('accept/:friendId')
  @HttpCode(HttpStatus.OK)
  async acceptFriendRequest(
    @Request() req,
    @Param('friendId', ParseUUIDPipe) friendId: string,
  ) {
    return this.friendshipsService.acceptFriendRequest(
      req.user.user_id,
      friendId,
    );
  }

  @Post('block/:friendId')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Request() req,
    @Param('friendId', ParseUUIDPipe) friendId: string,
  ) {
    return this.friendshipsService.blockUser(req.user.user_id, friendId);
  }

  @Delete('unblock/:friendId')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Request() req,
    @Param('friendId', ParseUUIDPipe) friendId: string,
  ) {
    return this.friendshipsService.unblockUser(req.user.user_id, friendId);
  }

  @Get('suggestions')
  async getFriendSuggestions(@Request() req, @Query('limit') limit?: number) {
    return this.friendshipsService.getFriendSuggestions(
      req.user.user_id,
      limit,
    );
  }
}
