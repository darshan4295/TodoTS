import { MongoClient, Db } from 'mongodb';

export class Database {
  private static instance: Database;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(mongoUri: string): Promise<void> {
    try {
      this.client = new MongoClient(mongoUri, {
        connectTimeoutMS: 2500, // 2.5 seconds connection timeout
        serverSelectionTimeoutMS: 5000, // 5 seconds server selection timeout
        socketTimeoutMS: 10000, // 10 seconds socket timeout
      });
      await this.client.connect();
      this.db = this.client.db();
      console.log('Connected to MongoDB database');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}
