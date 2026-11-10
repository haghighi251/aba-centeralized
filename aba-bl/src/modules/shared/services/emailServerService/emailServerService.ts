import { Injectable, Logger } from '@nestjs/common';
import { MailerService as MailerMain } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as pug from 'pug';

const IS_DEV = process.env.NODE_ENV !== 'production';

@Injectable()
export class EmailServerService {
  private readonly logger = new Logger(EmailServerService.name);
  // Lazily created Ethereal transporter — reused across calls in dev
  private devTransporter: nodemailer.Transporter | null = null;

  constructor(private readonly mailerMain: MailerMain) {}

  private async getDevTransporter(): Promise<nodemailer.Transporter> {
    if (!this.devTransporter) {
      const account = await nodemailer.createTestAccount();
      this.devTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: account.user, pass: account.pass },
      });
      this.logger.log(`Ethereal test account created: ${account.user}`);
    }
    return this.devTransporter;
  }

  private async sendRaw(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (IS_DEV) {
      const transport = await this.getDevTransporter();
      const info = await transport.sendMail({
        ...options,
        from: 'noreply@aba-dev.local',
      });
      this.logger.log(
        `📧 Email preview: ${nodemailer.getTestMessageUrl(info)}`,
      );
      return;
    }
    await this.mailerMain.sendMail(options);
  }

  async sendMail(datamailer): Promise<void> {
    const templatePath =
      __dirname + '../../../../../../../../src/' + datamailer.template;
    const html = this._bodyTemplate(templatePath, datamailer.dataTemplate);
    await this.sendRaw({
      to: datamailer.to,
      subject: datamailer.subject,
      html,
    });
  }

  _bodyTemplate(templatePath: string, data: object): string {
    return pug.renderFile(templatePath, { data });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    await this.sendRaw({
      to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Password Reset Request</h2>
          <p>Click the button below to reset your password. The link is valid for <strong>1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:#fff;text-decoration:none;border-radius:4px">Reset Password</a>
          <p style="margin-top:24px;font-size:0.85em;color:#666">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  private _resolveTemplatePath(templateName: string): string {
    const templateDir = path.resolve(
      __dirname,
      '../../../../../contexts/shared/infrastructure/utils/EmailTemplate',
    );
    return path.join(templateDir, templateName);
  }
}
