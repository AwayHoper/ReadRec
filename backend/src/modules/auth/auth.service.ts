import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /** Summary: This method creates a new user account with a default active vocabulary book. */
  async register(dto: RegisterDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        email: dto.email.toLowerCase()
      }
    });
    if (existingUser) {
      throw new ConflictException('邮箱已被注册。');
    }

    const defaultBook = await this.prismaService.vocabularyBook.findFirst({
      orderBy: {
        key: 'asc'
      }
    });
    if (!defaultBook) {
      throw new UnauthorizedException('当前没有可用词库。');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        activeBookId: defaultBook.id
      }
    });

    await this.prismaService.studyPlan.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: defaultBook.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        bookId: defaultBook.id,
        dailyWordCount: 6,
        newWordRatio: 2,
        reviewWordRatio: 1,
        articleStyle: 'EXAM'
      }
    });

    await this.prismaService.userBookProgress.upsert({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: defaultBook.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        bookId: defaultBook.id,
        learnedWordIds: [],
        reviewedWordIds: [],
        flaggedWordIds: []
      }
    });

    return this.createAuthPayload(user.id, user.email, user.activeBookId ?? defaultBook.id);
  }

  /** Summary: This method validates user credentials and returns a signed access token payload. */
  async login(dto: LoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: dto.email.toLowerCase()
      }
    });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误。');
    }
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误。');
    }
    return this.createAuthPayload(user.id, user.email, user.activeBookId ?? '');
  }

  /** Summary: This method returns the authenticated user's profile snapshot. */
  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId
      }
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在。');
    }
    return {
      id: user.id,
      email: user.email,
      activeBookId: user.activeBookId ?? ''
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
