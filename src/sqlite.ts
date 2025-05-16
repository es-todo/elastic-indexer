import sqlite3 from "sqlite3";

const { Database } = sqlite3;
type Database = sqlite3.Database;

export async function open_db(filename: string): Promise<Database> {
  return new Promise((resolve, reject) => {
    const db = new Database(filename, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(db);
      }
    });
  });
}

export async function close_db(db: Database) {
  return new Promise<void>((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
