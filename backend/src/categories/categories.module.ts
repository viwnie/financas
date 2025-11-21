import { Module, OnModuleInit } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, PrismaService],
})
export class CategoriesModule implements OnModuleInit {
  constructor(private categoriesService: CategoriesService) { }

  async onModuleInit() {
    await this.categoriesService.initSystemCategories();
  }
}
