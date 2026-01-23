import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PestsController } from './pests.controller';
import { PestsService } from './pests.service';
import { Pest } from './pest.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Pest])],
  controllers: [PestsController],
  providers: [PestsService],
})
export class PestsModule {}
