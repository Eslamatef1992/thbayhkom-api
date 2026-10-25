import { createApp } from './app';
import { config } from './config';
import { sequelize } from './db/sequelize';
import './db/models'; // ensure models + associations are registered

async function bootstrap() {
  await sequelize.authenticate();
  if (config.db.sync) {
    await sequelize.sync({ alter: true });
  }
  const app = createApp();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Thabayehkom API listening on http://localhost:${config.port}${config.apiBasePath}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
