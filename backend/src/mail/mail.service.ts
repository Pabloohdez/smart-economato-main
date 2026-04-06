import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  async sendMail(payload: MailPayload) {
    if (this.getMailMode() === 'log') {
      this.logger.warn(
        [
          'MAIL_MODE=log activo. Correo no enviado por SMTP.',
          `To: ${payload.to}`,
          `Subject: ${payload.subject}`,
          payload.text,
        ].join('\n'),
      );
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.getFromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.requiredEnv('SMTP_HOST');
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = this.requiredEnv('SMTP_USER');
    const pass = this.requiredEnv('SMTP_PASS');
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  private getMailMode() {
    const mode = String(process.env.MAIL_MODE || '').trim().toLowerCase();
    if (mode === 'smtp') {
      return 'smtp';
    }

    if (mode === 'log') {
      return 'log';
    }

    return process.env.NODE_ENV === 'production' ? 'smtp' : 'log';
  }

  private getFromAddress() {
    return process.env.SMTP_FROM || this.requiredEnv('SMTP_USER');
  }

  private requiredEnv(name: string) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new InternalServerErrorException(`Falta configurar ${name} para el envio real de correos.`);
    }
    return value;
  }
}