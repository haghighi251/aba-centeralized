import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-cbc';
  private key: Buffer;
  private iv: Buffer;

  constructor() {
    try {
      this.iv = randomBytes(16);
      this.iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
      this.key = scryptSync(
        process.env.ENCRYPTION_KEY || 'defaultKey',
        'salt',
        32,
      );
    } catch (e) {
      console.error('Failed to initialize encryption components:', e);
      throw new HttpException(
        'Failed to initialize encryption components',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  encrypt(text: string): string {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encryptedData: string): string {
    const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));

    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
