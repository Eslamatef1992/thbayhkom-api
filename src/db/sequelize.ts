import { Sequelize } from 'sequelize';
import { config } from '../config';

export const sequelize =
  config.db.dialect === 'postgres' && config.db.url
    ? new Sequelize(config.db.url, {
        dialect: 'postgres',
        logging: false,
        define: { underscored: true },
      })
    : new Sequelize({
        dialect: 'sqlite',
        storage: config.db.storage,
        logging: false,
        define: { underscored: true },
      });
