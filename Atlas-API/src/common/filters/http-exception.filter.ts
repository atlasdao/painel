import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let validationErrors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || exception.name;
        
        // Handle validation errors from class-validator
        if (responseObj.message && Array.isArray(responseObj.message)) {
          validationErrors = responseObj.message.map((msg: string) => {
            const [field, ...messageParts] = msg.split(' ');
            return {
              field,
              message: messageParts.join(' '),
            };
          });
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      
      // Log the full error for debugging
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        {
          requestId,
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.get('user-agent'),
        },
      );
    }

    const errorResponse: any = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    if (validationErrors) {
      errorResponse.errors = validationErrors;
    }

    // Log error for monitoring
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        {
          requestId,
          statusCode: status,
          error,
          path: request.url,
          method: request.method,
          ip: request.ip,
          userAgent: request.get('user-agent'),
        },
      );
    } else {
      this.logger.warn(
        `HTTP ${status} Response: ${message}`,
        {
          requestId,
          statusCode: status,
          error,
          path: request.url,
          method: request.method,
        },
      );
    }

    response.status(status).json(errorResponse);
  }
}