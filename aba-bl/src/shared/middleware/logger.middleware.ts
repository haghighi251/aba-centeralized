import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // Consider using the simpler functional middleware alternative any time your middleware doesn't need any dependencies.

  use(req: Request, res: Response, next: NextFunction) {
    console.log('Middleware is running from here ...');
    next();
  }
}
