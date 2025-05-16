import sqlite3, { type RunResult } from "sqlite3";

export class Database {
  private db: sqlite3.Database;

  private constructor(db: sqlite3.Database) {
    this.db = db;
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  public async run(sql: string, params: any[]): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      function callback(this: RunResult, error: Error | null) {
        if (error) {
          reject(error);
        } else {
          resolve(this);
        }
      }
      this.db.run(sql, params, callback);
    });
  }

  public async all<T>(sql: string, params: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      function callback(error: Error | null, rows: any) {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      }
      this.db.all(sql, params, callback);
    });
  }

  public static async open(filename: string): Promise<Database> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(filename, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(new Database(db));
        }
      });
    });
  }
}
