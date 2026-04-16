import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /** Summary: This method validates the bearer token and attaches the decoded user to the request. */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: { sub: string; email: string } }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少访问令牌。');
    }
    const token = authorization.replace('Bearer ', '');
    request.user = this.jwtService.verify<{ sub: string; email: string }>(token);
    return true;
  }
}