import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient();
      const authToken = this.extractToken(client);

      if (!authToken) {
        throw new WsException('Unauthorized access - No token provided');
      }

      const payload = await this.jwtService.verifyAsync(authToken);

      // Store the decoded user data in the socket
      client.data.user = payload;
      client.data.userId = payload.sub;

      return true;
    } catch (error) {
      throw new WsException('Unauthorized access - Invalid token');
    }
  }

  private extractToken(client: any): string | undefined {
    const auth =
      client.handshake?.auth?.token || client.handshake?.headers?.authorization;

    if (!auth) {
      return undefined;
    }

    // Handle 'Bearer <token>' format
    return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  }
}
