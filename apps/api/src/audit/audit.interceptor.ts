import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only track mutations (Create, Update, Delete). We skip GET requests to avoid database bloat.
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap({
          next: (data: any) => this.logAction(req, data, 'SUCCESS'),
          error: (error: any) => this.logAction(req, null, 'FAILED', error.message),
        }),
      );
    }

    return next.handle();
  }

  private async logAction(req: any, responseData: any, status: string, errorMessage?: string) {
    const user = req.user;
    
    // Skip if there is no authenticated user (e.g., the public /login endpoint)
    if (!user) return; 

    const url = req.originalUrl || req.url;
    const method = req.method;

    // Capture the client IP Address securely
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'UNKNOWN';

    const urlParts = url.split('?')[0].split('/').filter((p: string) => p.length > 0 && p !== 'v1' && p !== 'api');
    const baseEntity = urlParts.length > 0 ? urlParts[0].toUpperCase() : 'SYSTEM';

    let action = `${method}_${baseEntity}`; 
    const lastPart = urlParts[urlParts.length - 1];

    if (lastPart && !lastPart.match(/^[0-9a-fA-F-]{36}$/) && isNaN(Number(lastPart))) {
        action = `${lastPart.toUpperCase()}_${baseEntity}`;
    } else {
        if (method === 'POST') action = `CREATE_${baseEntity}`;
        if (method === 'PATCH' || method === 'PUT') action = `UPDATE_${baseEntity}`;
        if (method === 'DELETE') action = `DELETE_${baseEntity}`;
    }

    const entityId = req.params?.id || responseData?.id || null;

    // Safely construct details payload (masking passwords)
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***HIDDEN***';
    if (safeBody.current_password) safeBody.current_password = '***HIDDEN***';
    if (safeBody.new_password) safeBody.new_password = '***HIDDEN***';

    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: user.id || user.sub,
          lender_id: user.lender_id || null, 
          action: action,
          entity_type: baseEntity,
          entity_id: entityId,
          ip_address: ipAddress, // <-- NEW: Security Tracking
          details: {
            endpoint: url,
            method: method,
            payload: safeBody,
            status: status,
            error: errorMessage || null
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to write to Master Audit Ledger', error);
    }
  }
}