import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppDataService } from '../../common/data/app-data.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'readrec-dev-secret')
      })
    })
  ],
  controllers: [AuthController],
  providers: [AppDataService, AuthService, AuthGuard],
  exports: [AppDataService, AuthGuard, AuthService, JwtModule]
})
export class AuthModule {}