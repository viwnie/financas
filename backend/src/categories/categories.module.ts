import { Module, OnModuleInit } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaService } from '../prisma.service';
import { TranslationService } from '../common/translation.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, PrismaService, TranslationService],
  exports: [CategoriesService],
})
export class CategoriesModule implements OnModuleInit {
  constructor(private categoriesService: CategoriesService) { }

  async onModuleInit() {
    console.log('CategoriesModule: Initializing system categories...');
    // await this.categoriesService.initSystemCategories();
    console.log('CategoriesModule: System categories initialized.');
  }
}
