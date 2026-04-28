import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config(); // Load .env file

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../core/database/migrations/*{.ts,.js}')],
  synchronize: false, // Must be false when using migrations
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

export default new DataSource(dataSourceOptions);
