import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AppDataService } from '../../common/data/app-data.service.js';
import { createId } from '../../common/utils/id.util.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly appDataService: AppDataService,
    private readonly jwtService: JwtService
  ) {}

  /** Summary: This method creates a new user account with a default active vocabulary book. */
  async register(dto: RegisterDto) {
    const state = this.appDataService.getState();
    const existingUser = state.users.find((user) => user.email === dto.email.toLowerCase());
    if (existingUser) {
      throw new ConflictException('邮箱已被注册。');
    }
    const defaultBook = state.books[0];
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.appDataService.addUser({
      id: createId('user'),
      email: dto.email.toLowerCase(),
      passwordHash,
      activeBookId: defaultBook.id
    });
    this.appDataService.upsertProgress({
      userId: user.id,
      bookId: defaultBook.id,
      learnedWordIds: [],
      reviewedWordIds: [],
      flaggedWordIds: []
    });
    this.appDataService.upsertPlan({
      id: createId('plan'),
      userId: user.id,
      bookId: defaultBook.id,
      dailyWordCount: 6,
      newWordRatio: 2,
      reviewWordRatio: 1,
      articleStyle: 'EXAM'
    });
    return this.createAuthPayload(user.id, user.email, user.activeBookId);
  }

  /** Summary: This method validates user credentials and returns a signed access token payload. */
  async login(dto: LoginDto) {
    const state = this.appDataService.getState();
    const user = state.users.find((item) => item.email === dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误。');
    }
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误。');
    }
    return this.createAuthPayload(user.id, user.email, user.activeBookId);
  }

  /** Summary: This method returns the authenticated user's profile snapshot. */
  getProfile(userId: string) {
    const user = this.appDataService.getState().users.find((item) => item.id === userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在。');
    }
    return {
      id: user.id,
      email: user.email,
      activeBookId: user.activeBookId
    };
  }

  /** Summary: This method signs a JWT and shapes the common auth response payload. */
  private createAuthPayload(userId: string, email: string, activeBookId: string) {
    return {
      accessToken: this.jwtService.sign({ sub: userId, email }),
      user: {
        id: userId,
        email,
        activeBookId
      }
    };
  }
}