import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Conexión a PostgreSQL en Supabase (remoto).
 * No se usa base de datos local; toda la persistencia está en Supabase.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'aws-1-eu-west-1.pooler.supabase.com',
      port: parseInt(process.env.DB_PORT || '6543', 10),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres.tolmfuusklacewxcvwqj',
      password: process.env.DB_PASS || 'dfbZGsDR0LVppIPZ',
      max: 10,
    });
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    const result = await this.pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
