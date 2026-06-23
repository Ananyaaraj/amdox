import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = req;
    const mutateMethods = ["POST", "PUT", "PATCH", "DELETE"];

    return next.handle().pipe(
      tap(async (data) => {
        if (mutateMethods.includes(method) && user) {
          // Audit logging is handled by the AuditService via events
          // This interceptor marks the request for audit trail
          req.auditData = {
            action: method,
            resource: url.split("/")[3] || url,
            userId: user?.id,
            tenantId: user?.tenantId,
            ipAddress: ip,
            userAgent: headers["user-agent"],
          };
        }
      })
    );
  }
}
