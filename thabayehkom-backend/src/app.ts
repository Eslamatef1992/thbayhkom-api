import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { contextMiddleware } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';
import mobileRoutes from './routes';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload.routes';
import { buildOpenApiSpec } from './docs/openapi';
import { uploadDir } from './services/upload';

export function createApp() {
  const app = express();
app.set("trust proxy", 1);

  // Relax helmet's CSP so Swagger UI's inline assets load; allow cross-origin image loading.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Flutter sends form-urlencoded bodies
  if (config.env !== 'test') app.use(morgan('dev'));

  // Serve uploaded files statically at /uploads/<filename>.
  app.use('/uploads', express.static(uploadDir));

  // Custom-header context (fcmToken, countryId, Accept-Language) for the mobile app.
  app.use(contextMiddleware);

  app.get('/health', (_req, res) => res.json({ status: 'ok', env: config.env }));

  // Swagger UI + raw spec. helmet's CSP can block Swagger assets, so relax it here.
  const openApiSpec = buildOpenApiSpec();
  app.get('/swagger.json', (_req, res) => res.json(openApiSpec));
  app.use(
    '/swagger',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Thabayehkom API Docs',
      swaggerOptions: { persistAuthorization: true },
    })
  );

  // Rate limit auth-sensitive endpoints.
  const authLimiter = rateLimit({ windowMs: 60_000, max: 30 });
  app.use(`${config.apiBasePath}/login`, authLimiter);
  app.use(`${config.apiBasePath}/signUp`, authLimiter);
  app.use(`${config.apiBasePath}/admin/auth/login`, authLimiter);

  // Upload API (image upload/delete; auth required). Mounted before the mobile
  // catch-all so /upload/* is not shadowed.
  app.use(`${config.apiBasePath}/upload`, uploadRoutes);

  // Admin dashboard API (conventional REST, JWT + RBAC).
  app.use(`${config.apiBasePath}/admin`, adminRoutes);

  // Mobile API (envelope contract). Mounted last so /admin isn't shadowed.
  app.use(config.apiBasePath, mobileRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}


