import { JwtPayload } from 'jsonwebtoken';

declare module 'express' {
  export interface Request {
    user?:
      | JwtPayload
      | { sub: number; username: string; role: string; companyId: number };
  }
}
