import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WrongBookController } from './wrong-book.controller.js';
import { WrongBookService } from './wrong-book.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WrongBookController],
  providers: [WrongBookService]
})
export class WrongBookModule {}