import sqlite3 from "sqlite3";

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
