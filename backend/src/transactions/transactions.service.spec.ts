import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma.service';
import { TransactionInstallmentsService } from './transaction-installments.service';
import { TransactionParticipantsService } from './transaction-participants.service';
import { TransactionSharesService } from './transaction-shares.service';
import { TransactionCategoryHelperService } from './transaction-category-helper.service';
import { TransactionExportService } from './transaction-export.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CategoriesService } from '../categories/categories.service';

describe('TransactionsService', () => {
    let service: TransactionsService;

    const mockPrisma = {
        $transaction: jest.fn(),
    };

    const mockParticipantsService = {};
    const mockInstallmentsService = {};
    const mockSharesService = {};
    const mockCategoryHelper = {};
    const mockExportService = {};
    const mockNotificationsGateway = {};
    const mockNotificationsService = {};
    const mockCategoriesService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: TransactionParticipantsService, useValue: mockParticipantsService },
                { provide: TransactionInstallmentsService, useValue: mockInstallmentsService },
                { provide: TransactionSharesService, useValue: mockSharesService },
                { provide: TransactionCategoryHelperService, useValue: mockCategoryHelper },
                { provide: TransactionExportService, useValue: mockExportService },
                { provide: NotificationsGateway, useValue: mockNotificationsGateway },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: CategoriesService, useValue: mockCategoriesService },
            ],
        }).compile();

        service = module.get<TransactionsService>(TransactionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
