import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/exceptions/domain-exception.filter';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
const Tokens = require('csrf');
// import { CustomNestLogger } from './shared/infrastructure/logger/custom-nest-logger';
// import { LoggerService } from './contexts/shared/application/logger/logger.service';

async function bootstrap() {
  const port = process.env.PORT || 3000;
  // rawBody: true populates req.rawBody (the exact bytes a caller sent,
  // e.g. the GitHub webhook controller needs it to verify X-Hub-Signature-256
  // over the raw payload rather than a re-serialized req.body).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // Behind a reverse proxy (Nginx/Caddy) terminating TLS, Express otherwise
  // reports req.protocol as 'http' — this makes it trust X-Forwarded-* from
  // the immediate proxy hop, which buildWebhookUrl() (repository-connection
  // controller) and the secure-cookie logic below both depend on.
  app.set('trust proxy', 1);
  app.useGlobalFilters(new DomainExceptionFilter());
  const csrfProtection = new Tokens();
  // try {
  //   const loggerService = app.get(LoggerService);
  //   const customLogger = new CustomNestLogger(loggerService, 'AppModule');
  //   app.useLogger(customLogger);
  // } catch (error) {
  //   console.error('Failed to initialize CustomNestLogger:', error);
  // }

  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use(cookieParser(process.env.COOKIE_SECRET));

  // DEBUGGING MIDDLEWARE – logs CSRF-related data
  app.use((req, res, next) => {
    console.log('\n[Request and Response DEBUGGING] ================');
    console.log('Path:', req.path);
    // console.log('Method:', req.method);
    // console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    // console.log("Response status (before handler):", res.statusCode);
    // console.log("Response:", res);
    next();
  });

  // Middleware to generate token (used in GET /csrf-token)
  app.use((req, res, next) => {
    // Attach a method to generate token from the secret stored in signed cookie
    req.csrfToken = () => {
      let secret = req.signedCookies?._csrf;
      if (!secret) {
        // Generate a new secret and store it in a signed cookie
        secret = csrfProtection.secretSync();
        res.cookie('_csrf', secret, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          signed: true,
        });
      }
      return csrfProtection.create(secret);
    };
    next();
  });

  // Middleware to verify token on state‑changing requests
  app.use((req, res, next) => {
    const excludedPaths = [
      '/auth/google',
      '/auth/github',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh',
    ];
    // Bearer-token requests are inherently CSRF-safe — the browser never
    // attaches an Authorization header automatically, so no forged request
    // from another origin can include it.
    const hasBearerToken =
      typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ');

    // GitHub webhook deliveries can send neither a CSRF cookie nor a Bearer
    // token — they're authenticated separately, via HMAC signature, inside
    // GithubWebhookController. Prefix match since the path carries a
    // per-connection token (/webhooks/github/:webhookToken).
    const isInboundWebhook =
      req.path.startsWith('/webhooks/github/') ||
      req.path.startsWith('/webhooks/bitbucket/');

    if (
      excludedPaths.includes(req.path) ||
      isInboundWebhook ||
      ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
      hasBearerToken
    ) {
      return next();
    }

    const secret = req.signedCookies?._csrf;
    const token = req.headers['x-csrf-token'] || req.body?._csrf;

    if (!secret || !token || !csrfProtection.verify(secret, token)) {
      console.error('[CSRF] Invalid token');
      return res
        .status(403)
        .json({ success: false, error: 'invalid csrf token' });
    }
    next();
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ABA Business Logic API')
    .setDescription(
      'BFF for the AI Business Assistant SECaaS platform: authentication, ' +
        'company/environment/user management, AI assistant settings, and ' +
        'pricing packages. All endpoints return the common ' +
        '{ success, error, data } envelope.\n\n' +
        'Click **Authorize** to set a Bearer access token (from `POST /auth/login`) ' +
        'and/or a CSRF token (from `GET /auth/csrf-token`) once — Swagger UI will ' +
        'attach them to every request you make from this page.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description:
          'CSRF token issued by GET /auth/csrf-token. Only required for ' +
          'state-changing requests (POST/PUT/PATCH/DELETE) that are NOT ' +
          'authenticated with a Bearer token.',
      },
      'csrf-token',
    )
    .addSecurityRequirements('bearer')
    .addSecurityRequirements('csrf-token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  console.log(`🚀 Service ready at port: ${port}`);
  console.log(`📖 Swagger docs available at: /api/docs`);
}
bootstrap();
