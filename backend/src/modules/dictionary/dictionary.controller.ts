import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { DictionaryService } from './dictionary.service.js';

@Controller('books')
@UseGuards(AuthGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  /** Summary: This endpoint returns all official books with the user's progress summary. */
  @Get()
  getBooks(@Req() request: Request & { user: { sub: string } }) {
    return this.dictionaryService.getBooks(request.user.sub);
  }

  /** Summary: This endpoint returns the selected book's plan, progress, and metadata. */
  @Get(':bookId')
  getBookDetail(@Req() request: Request & { user: { sub: string } }, @Param('bookId') bookId: string) {
    return this.dictionaryService.getBookDetail(request.user.sub, bookId);
  }

  /** Summary: This endpoint returns the selected book's words filtered by progress status when requested. */
  @Get(':bookId/words')
  getBookWords(
    @Req() request: Request & { user: { sub: string } },
    @Param('bookId') bookId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.dictionaryService.getBookWords(
      request.user.sub,
      bookId,
      status,
      normalizePositiveInteger(page, 1),
      normalizePositiveInteger(pageSize, 50)
    );
  }
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
