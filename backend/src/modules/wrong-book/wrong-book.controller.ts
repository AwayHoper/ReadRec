import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { WrongBookService } from './wrong-book.service.js';

@Controller('wrong-book')
@UseGuards(AuthGuard)
export class WrongBookController {
  constructor(private readonly wrongBookService: WrongBookService) {}

  /** Summary: This endpoint returns the current user's wrong-book list. */
  @Get()
  getWrongBook(@Req() request: Request & { user: { sub: string } }) {
    return this.wrongBookService.getWrongBook(request.user.sub);
  }

  /** Summary: This endpoint marks selected words into the wrong-book list. */
  @Post('mark')
  markWrongBook(@Req() request: Request & { user: { sub: string } }, @Body('vocabularyItemIds') vocabularyItemIds: string[]) {
    return this.wrongBookService.markWords(request.user.sub, vocabularyItemIds ?? []);
  }

  /** Summary: This endpoint returns a plain-text export payload for the wrong-book list. */
  @Get('export')
  exportWrongBook(@Req() request: Request & { user: { sub: string } }) {
    return this.wrongBookService.exportWrongBook(request.user.sub);
  }
}