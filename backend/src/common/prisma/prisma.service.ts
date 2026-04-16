import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Summary: This lifecycle hook connects Prisma when the Nest module starts. */
  async onModuleInit() {
    await this.$connect();
  }

  /** Summary: This lifecycle hook disconnects Prisma when the Nest module stops. */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
