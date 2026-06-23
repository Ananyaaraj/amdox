import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
const compression = require("compression");
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT", 3001);
  const corsOrigins = configService.get<string>("CORS_ORIGINS", "http://localhost:3000");

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
    })
  );
  app.use(compression());

  // CORS
  app.enableCors({
    origin: corsOrigins.split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Global prefix
  app.setGlobalPrefix("api/v1", { exclude: ["/health/:path*", "/graphql"] });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new AuditInterceptor()
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Amdox ERP API")
    .setDescription("Enterprise AI-Powered Cloud ERP Suite - REST API")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication & Authorization")
    .addTag("finance", "Financial Management")
    .addTag("hr", "Human Resources & Payroll")
    .addTag("supply-chain", "Supply Chain & Inventory")
    .addTag("projects", "Project Management")
    .addTag("bi", "Business Intelligence")
    .addTag("notifications", "Notification Engine")
    .addTag("audit", "Audit & Compliance")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Health endpoints (no prefix)
  await app.listen(port);

  logger.log(`🚀 Amdox ERP API running on: http://localhost:${port}`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
  logger.log(`🔍 GraphQL: http://localhost:${port}/graphql`);
}

bootstrap();
