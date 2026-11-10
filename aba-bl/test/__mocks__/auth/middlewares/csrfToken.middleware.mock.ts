import { INestApplication } from '@nestjs/common';

/**
 * Minimal stand-in for the CSRF token middleware registered in `main.ts`.
 * It attaches a deterministic `req.csrfToken()` so
 * `GET /auth/csrf-token` can be exercised without bootstrapping the full app
 * (cookie-parser, real csrf secrets, etc.).
 */
export function applyCsrfTokenMiddlewareMock(app: INestApplication) {
  app.use((req: any, res: any, next: () => void) => {
    req.csrfToken = () => 'mock-csrf-token';
    next();
  });
}
