import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as { message?: string | string[] })?.message ?? exception.message
        : exception instanceof Error
          ? exception.message
          : 'Error interno del servidor';

    const finalMessage = Array.isArray(message) ? message[0] : message;

    res.status(status).json({
      success: false,
      error: {
        message: finalMessage,
        code: status,
      },
    });
  }
}
