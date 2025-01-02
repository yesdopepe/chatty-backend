import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const authToken = client.handshake.headers.authorization?.split(' ')[1];

      if (!authToken) {
        throw new WsException('Missing auth token');
      }

      const payload = await this.jwtService.verify(authToken);
      client.data.userId = payload.sub;
      return true;
    } catch (err) {
      throw new WsException('Invalid credentials');
    }
  }
}
