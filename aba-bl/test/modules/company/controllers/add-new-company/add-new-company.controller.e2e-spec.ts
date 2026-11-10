import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  INestApplication,
  InternalServerErrorException,
} from '@nestjs/common';
import * as request from 'supertest';
import { CompanyController } from '@/modules/company/controllers/add-new-company/add-new-company.controller';
import { AddCompanyUseCase } from '@/modules/company/usecases/add-company-use-case';
import { AddUserDomainException } from '@/modules/users/exceptions/AddUserDomainError';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import {
  createAddCompanyUseCaseMock,
  MockedAddCompanyUseCase,
} from '@test/__mocks__/company/usecases/add-company-use-case.mock';
import { validRegisterCompanyPayload } from '@test/__mocks__/company/fixtures/company.fixtures';

/**
 * E2E tests for /company/new.
 *
 * Nothing here touches PostgreSQL/Prisma or bcrypt: AddCompanyUseCase is
 * fully mocked.
 */
describe('CompanyController (e2e)', () => {
  let app: INestApplication;
  let mockAddCompanyUseCase: MockedAddCompanyUseCase;

  beforeEach(async () => {
    mockAddCompanyUseCase = createAddCompanyUseCaseMock();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        { provide: AddCompanyUseCase, useValue: mockAddCompanyUseCase },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /company/new ───────────────────────────────────────────────────

  describe('POST /company/new', () => {
    it('returns 201 with success:true when registration succeeds', async () => {
      mockAddCompanyUseCase.execute.mockResolvedValue(true);

      await request(app.getHttpServer())
        .post('/company/new')
        .send(validRegisterCompanyPayload)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBe(true);
        });

      expect(mockAddCompanyUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          username: validRegisterCompanyPayload.username,
          email: validRegisterCompanyPayload.email,
          website: validRegisterCompanyPayload.website,
        }),
      );
    });

    it('returns success:false when the use case reports a domain error', async () => {
      mockAddCompanyUseCase.execute.mockRejectedValue(
        new AddUserDomainException(
          'Failed to add new company: A company with the same email or username already exists.',
        ),
      );

      await request(app.getHttpServer())
        .post('/company/new')
        .send(validRegisterCompanyPayload)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toContain('Failed to add new company');
        });
    });

    it('returns success:false when the use case reports an internal error', async () => {
      mockAddCompanyUseCase.execute.mockRejectedValue(
        new InternalServerErrorException('Unexpected failure.'),
      );

      await request(app.getHttpServer())
        .post('/company/new')
        .send(validRegisterCompanyPayload)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('returns 400 when username is missing', async () => {
      const { username, ...rest } = validRegisterCompanyPayload;

      await request(app.getHttpServer())
        .post('/company/new')
        .send(rest)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when username is shorter than 3 characters', async () => {
      await request(app.getHttpServer())
        .post('/company/new')
        .send({ ...validRegisterCompanyPayload, username: 'ab' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when username contains invalid characters', async () => {
      await request(app.getHttpServer())
        .post('/company/new')
        .send({ ...validRegisterCompanyPayload, username: 'invalid username!' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when email is missing', async () => {
      const { email, ...rest } = validRegisterCompanyPayload;

      await request(app.getHttpServer())
        .post('/company/new')
        .send(rest)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when email is not a valid email address', async () => {
      await request(app.getHttpServer())
        .post('/company/new')
        .send({ ...validRegisterCompanyPayload, email: 'not-an-email' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when website is missing', async () => {
      const { website, ...rest } = validRegisterCompanyPayload;

      await request(app.getHttpServer())
        .post('/company/new')
        .send(rest)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when website is not a valid URL', async () => {
      await request(app.getHttpServer())
        .post('/company/new')
        .send({ ...validRegisterCompanyPayload, website: 'not-a-url' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when password is missing', async () => {
      const { password, ...rest } = validRegisterCompanyPayload;

      await request(app.getHttpServer())
        .post('/company/new')
        .send(rest)
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/company/new')
        .send({ ...validRegisterCompanyPayload, password: 'short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 404 for GET (method not allowed)', async () => {
      await request(app.getHttpServer())
        .get('/company/new')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns 404 for DELETE (method not allowed)', async () => {
      await request(app.getHttpServer())
        .delete('/company/new')
        .expect(HttpStatus.NOT_FOUND);

      expect(mockAddCompanyUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
