import { Module, OnModuleInit } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaService } from '../prisma.service';
import { TranslationService } from '../common/translation.service';
import { CategoryPredictionService } from './category-prediction.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, PrismaService, TranslationService, CategoryPredictionService],
  exports: [CategoriesService, CategoryPredictionService],
})
export class CategoriesModule { }
