import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma.service';
import { JwtAuthGuard } from './../src/auth/jwt-auth.guard';
import { TranslationService } from './../src/common/translation.service';

describe('Categories Deduplication (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let userId: string;

    const mockTranslationService = {
        translate: jest.fn().mockImplementation(async (text, src, tgt) => {
            text = text.toLowerCase();
            if (text === 'cachorro' && src === 'pt' && tgt === 'en') return 'dog';
            if (text === 'cachorro' && src === 'pt' && tgt === 'es') return 'perro';

            if (text === 'dog' && src === 'en' && tgt === 'pt') return 'cachorro';
            if (text === 'dog' && src === 'en' && tgt === 'es') return 'perro';

            if (text === 'perro' && src === 'es' && tgt === 'pt') return 'cachorro';
            if (text === 'perro' && src === 'es' && tgt === 'en') return 'dog';

            return text;
        }),
        onModuleInit: jest.fn(),
    };

    beforeAll(async () => {
        // Create a user directly in DB for testing
        // We need a separate prisma client instance or use the one from the app after compilation
        // But we need the user ID for the guard override.
        // So we'll use a temporary prisma client or just mock the ID and create the user in the test body if possible.
        // Actually, we can create the module first, get prisma, create user, then init app?
        // No, overrideGuard happens before compile.

        // We'll use a fixed UUID for the test user.
        userId = 'test-user-uuid-' + Date.now();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { userId };
                    return true;
                },
            })
            .overrideProvider(TranslationService)
            .useValue(mockTranslationService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = app.get<PrismaService>(PrismaService);

        // Create the user in DB
        await prisma.user.create({
            data: {
                id: userId,
                name: 'Test User',
                email: `test-${Date.now()}@example.com`,
                password: 'hashedpassword',
                username: `testuser${Date.now()}`
            }
        });
    });

    afterAll(async () => {
        if (userId) {
            await prisma.category.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        }
        await app.close();
    });

    it('should create a new category in PT', async () => {
        const res = await request(app.getHttpServer())
            .post('/categories')
            .send({ name: 'Cachorro', language: 'pt' })
            .expect(201);

        expect(res.body.name_pt).toBe('cachorro');
        expect(res.body.name_en).toBe('dog'); // Mocked translation
        expect(res.body.name_es).toBe('perro'); // Mocked translation
    });

    it('should return existing category when creating "Dog" in EN', async () => {
        // First ensure "Cachorro" exists (created in previous test)
        // We can rely on the previous test or create it again (it should return existing anyway)

        const res = await request(app.getHttpServer())
            .post('/categories')
            .send({ name: 'Dog', language: 'en' })
            .expect(201); // Controller returns 201 for create even if existing is returned, or 200?
        // NestJS @Post returns 201 by default.

        expect(res.body.name_pt).toBe('cachorro');
        expect(res.body.name_en).toBe('dog');

        // Check if it's the same ID as the one created for Cachorro
        const cachorro = await prisma.category.findFirst({ where: { name_pt: 'cachorro', userId } });
        expect(res.body.id).toBe(cachorro.id);
    });

    it('should return existing category when creating "Perro" in ES', async () => {
        const res = await request(app.getHttpServer())
            .post('/categories')
            .send({ name: 'Perro', language: 'es' })
            .expect(201);

        expect(res.body.name_es).toBe('perro');

        const cachorro = await prisma.category.findFirst({ where: { name_pt: 'cachorro', userId } });
        expect(res.body.id).toBe(cachorro.id);
    });
});
