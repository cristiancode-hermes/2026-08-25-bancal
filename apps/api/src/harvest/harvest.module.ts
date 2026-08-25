import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { HarvestService } from './harvest.service';
import { HarvestController } from './harvest.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  controllers: [HarvestController],
  providers: [HarvestService],
  exports: [HarvestService],
})
export class HarvestModule {}
