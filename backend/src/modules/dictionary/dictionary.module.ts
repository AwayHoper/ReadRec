import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DictionaryController],
  providers: [DictionaryService],
  exports: [DictionaryService]
})
export class DictionaryModule {}
