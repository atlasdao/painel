import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check for API key in headers
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key é obrigatória');
    }

    // Validate API key
    const user = await this.prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
        commerceMode: true,
        paymentLinksEnabled: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('API key inválida');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa');
    }

    // Attach user to request
    request.user = user;

    return true;
  }
}