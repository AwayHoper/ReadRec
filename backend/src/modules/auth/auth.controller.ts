import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthGuard } from './auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Summary: This endpoint registers a new user and returns the initial auth payload. */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** Summary: This endpoint logs in an existing user and returns a fresh auth payload. */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Summary: This endpoint returns the currently authenticated user's profile. */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: Request & { user: { sub: string } }) {
    return this.authService.getProfile(request.user.sub);
  }
}