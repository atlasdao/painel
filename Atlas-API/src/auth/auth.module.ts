import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ExternalJwtStrategy } from './external-jwt.strategy';
import { RsaJwtStrategy } from './rsa-jwt.strategy';
import { CustomJwtStrategy } from './custom-jwt.strategy';
import { UserRepository } from '../repositories/user.repository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'custom-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    ExternalJwtStrategy, 
    RsaJwtStrategy, 
    CustomJwtStrategy, 
    UserRepository,
  ],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}