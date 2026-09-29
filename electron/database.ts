import Database from 'better-sqlite3';
import { app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Store from 'electron-store';

// Tracks which user is currently logged in, persisted across app restarts.
// Deliberately separate from the main SQLite database: this is UI/session
// state (which account is active), not application data.
interface SessionStore {
  currentUserId: string | null;
}
const sessionStore = new Store<SessionStore>({
  name: 'reelshare-session',
  defaults: { currentUserId: null }
});

interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  encrypted_api_keys: string;
  preferences: string;
  created_at: string;
  updated_at: string;
}

interface SocialAccount {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface Video {
  id: string;
  user_id: string;
  file_path: string;
  title: string;
  description: string;
  duration_seconds: number;
  thumbnail_path: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface ScheduledPost {
  id: string;
  video_id: string;
  account_id: string;
  scheduled_time: string;
  status: 'pending' | 'processing' | 'published' | 'failed';
  published_time: string | null;
  platform_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface Analytics {
  id: string;
  post_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  collected_at: string;
}

class DatabaseService {
  private db: Database.Database | null = null;
  private encryptionKey: Buffer;

  constructor() {
    // Generate or load encryption key
    this.encryptionKey = this.getEncryptionKey();
  }

  async initialize(): Promise<void> {
    const dbPath = this.getDatabasePath();
    
    // Create directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Create tables
    this.createTables();
    
    console.log(`Database initialized at ${dbPath}`);
  }

  private getDatabasePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'database.sqlite');
  }

  private getEncryptionKey(): Buffer {
    const keyPath = path.join(app.getPath('userData'), 'encryption.key');
    
    if (fs.existsSync(keyPath)) {
      return Buffer.from(fs.readFileSync(keyPath, 'utf-8'), 'hex');
    }
    
    // Generate new key
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
    return key;
  }

  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  }

  private createTables(): void {
    if (!this.db) return;

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        encrypted_api_keys TEXT,
        preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate pre-1.0.5 users tables (created before password columns
    // existed) by adding the missing columns. ALTER TABLE ADD COLUMN is a
    // no-op-safe operation to attempt and ignore failure on, since SQLite
    // has no "ADD COLUMN IF NOT EXISTS" and better-sqlite3 has no
    // information_schema query helper built in.
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
    } catch { /* column already exists */ }
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN password_salt TEXT NOT NULL DEFAULT ''`);
    } catch { /* column already exists */ }

    // Social accounts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        account_name TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, platform, account_name)
      )
    `);

    // Videos table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        duration_seconds INTEGER NOT NULL,
        thumbnail_path TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Scheduled posts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'published', 'failed')),
        published_time DATETIME,
        platform_post_id TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES social_accounts(id) ON DELETE CASCADE
      )
    `);

    // Analytics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        engagement_rate REAL DEFAULT 0,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_time ON scheduled_posts(scheduled_time);
      CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id);
    `);
  }

  // Password hashing helpers (scrypt, built into Node's crypto module --
  // no extra native dependency needed, unlike bcrypt). Each user gets a
  // unique random salt; the hash is derived from password+salt so two
  // users with the same password never have matching hashes.
  private hashPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  private verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const actualHash = this.hashPassword(password, salt);
    // Timing-safe comparison to avoid leaking hash-match info via
    // response-time side channels.
    const actual = Buffer.from(actualHash, 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  }

  // User operations
  async registerUser(email: string, name: string, password: string): Promise<{ id: string; email: string; name: string }> {
    if (!this.db) throw new Error('Database not initialized');

    const normalizedEmail = email.trim().toLowerCase();

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, password_hash, password_salt, encrypted_api_keys, preferences, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, normalizedEmail, name.trim(), passwordHash, salt, '', '{}', now, now);

    return { id, email: normalizedEmail, name: name.trim() };
  }

  async loginUser(email: string, password: string): Promise<{ id: string; email: string; name: string }> {
    if (!this.db) throw new Error('Database not initialized');

    const normalizedEmail = email.trim().toLowerCase();
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as User | undefined;

    if (!user || !this.verifyPassword(password, user.password_salt, user.password_hash)) {
      throw new Error('Invalid email or password');
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  async getUser(email: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return (stmt.get(email.trim().toLowerCase()) as User | undefined) || null;
  }

  async getUserById(id: string): Promise<{ id: string; email: string; name: string } | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT id, email, name FROM users WHERE id = ?');
    return (stmt.get(id) as { id: string; email: string; name: string } | undefined) || null;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare(`
      UPDATE users 
      SET preferences = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(JSON.stringify(preferences), new Date().toISOString(), userId);
  }

  // Video operations
  async createVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO videos (id, user_id, file_path, title, description, duration_seconds, thumbnail_path, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      video.user_id,
      video.file_path,
      video.title,
      video.description || '',
      video.duration_seconds,
      video.thumbnail_path || '',
      video.metadata || '{}',
      now,
      now
    );
    
    return id;
  }

  async getVideos(userId: string): Promise<Video[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Video[];
  }

  async getVideo(id: string): Promise<Video | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM videos WHERE id = ?');
    return stmt.get(id) as Video | null;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE videos 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
  }

  async deleteVideo(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Look up the video first so we can also remove its file and
    // thumbnail from disk -- deleting only the database row would leave
    // orphaned video/thumbnail files taking up space forever.
    const video = await this.getVideo(id);

    const stmt = this.db.prepare('DELETE FROM videos WHERE id = ?');
    stmt.run(id);

    if (video) {
      for (const filePath of [video.file_path, video.thumbnail_path]) {
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error(`Failed to delete file ${filePath}:`, error);
          }
        }
      }
    }
  }

  // Social account operations
  async createSocialAccount(account: Omit<SocialAccount, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Encrypt access token
    const encryptedAccessToken = this.encrypt(account.access_token);
    const encryptedRefreshToken = account.refresh_token ? this.encrypt(account.refresh_token) : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO social_accounts (id, user_id, platform, account_name, access_token, refresh_token, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      account.user_id,
      account.platform,
      account.account_name,
      encryptedAccessToken,
      encryptedRefreshToken,
      account.expires_at,
      now,
      now
    );
    
    return id;
  }

  async getSocialAccounts(userId: string): Promise<SocialAccount[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM social_accounts WHERE user_id = ? ORDER BY platform, account_name');
    const accounts = stmt.all(userId) as SocialAccount[];
    
    // Decrypt tokens
    return accounts.map(account => ({
      ...account,
      access_token: this.decrypt(account.access_token),
      refresh_token: account.refresh_token ? this.decrypt(account.refresh_token) : null
    }));
  }

  async getSocialAccount(id: string): Promise<SocialAccount | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM social_accounts WHERE id = ?');
    const account = stmt.get(id) as SocialAccount | null;
    
    if (account) {
      return {
        ...account,
        access_token: this.decrypt(account.access_token),
        refresh_token: account.refresh_token ? this.decrypt(account.refresh_token) : null
      };
    }
    
    return null;
  }

  // Scheduled posts operations
  async createScheduledPost(post: Omit<ScheduledPost, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO scheduled_posts (id, video_id, account_id, scheduled_time, status, published_time, platform_post_id, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      post.video_id,
      post.account_id,
      post.scheduled_time,
      post.status || 'pending',
      post.published_time || null,
      post.platform_post_id || null,
      post.error_message || null,
      now,
      now
    );
    
    return id;
  }

  async getScheduledPosts(userId: string, status?: string, limit: number = 100): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    let query = `
      SELECT sp.*, v.title as video_title, v.thumbnail_path, sa.platform, sa.account_name
      FROM scheduled_posts sp
      JOIN videos v ON sp.video_id = v.id
      JOIN social_accounts sa ON sp.account_id = sa.id
      WHERE v.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (status) {
      query += ' AND sp.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY sp.scheduled_time ASC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // Same as getScheduledPosts, but across every user rather than one --
  // used by the background scheduler (electron/scheduler.ts), which needs
  // to fire due posts for whichever accounts exist, not just one
  // hardcoded user. The renderer-facing IPC handlers still use the
  // per-user variant above, scoped to the logged-in user.
  async getAllPendingScheduledPosts(status?: string, limit: number = 1000): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT sp.*, v.title as video_title, v.thumbnail_path, sa.platform, sa.account_name
      FROM scheduled_posts sp
      JOIN videos v ON sp.video_id = v.id
      JOIN social_accounts sa ON sp.account_id = sa.id
    `;

    const params: any[] = [];

    if (status) {
      query += ' WHERE sp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sp.scheduled_time ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  async getScheduledPost(id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT sp.*, v.title as video_title, v.thumbnail_path, sa.platform, sa.account_name
      FROM scheduled_posts sp
      JOIN videos v ON sp.video_id = v.id
      JOIN social_accounts sa ON sp.account_id = sa.id
      WHERE sp.id = ?
    `);

    return stmt.get(id) || null;
  }

  async updateScheduledPost(id: string, updates: Partial<ScheduledPost>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE scheduled_posts 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
  }

  // Analytics operations
  async createAnalytics(analytics: Omit<Analytics, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO analytics (id, post_id, views, likes, comments, shares, engagement_rate, collected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      analytics.post_id,
      analytics.views,
      analytics.likes,
      analytics.comments,
      analytics.shares,
      analytics.engagement_rate,
      analytics.collected_at || new Date().toISOString()
    );
    
    return id;
  }

  async getAnalytics(postId: string): Promise<Analytics[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stmt = this.db.prepare('SELECT * FROM analytics WHERE post_id = ? ORDER BY collected_at ASC');
    return stmt.all(postId) as Analytics[];
  }

  async getAnalyticsSummary(userId: string, days: number = 30): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const query = `
      SELECT 
        DATE(sp.published_time) as date,
        sa.platform,
        COUNT(sp.id) as posts,
        SUM(a.views) as total_views,
        SUM(a.likes) as total_likes,
        SUM(a.comments) as total_comments,
        SUM(a.shares) as total_shares,
        AVG(a.engagement_rate) as avg_engagement_rate
      FROM scheduled_posts sp
      JOIN videos v ON sp.video_id = v.id
      JOIN social_accounts sa ON sp.account_id = sa.id
      LEFT JOIN analytics a ON sp.id = a.post_id
      WHERE v.user_id = ? 
        AND sp.status = 'published'
        AND sp.published_time >= ?
      GROUP BY DATE(sp.published_time), sa.platform
      ORDER BY date DESC
    `;
    
    const stmt = this.db.prepare(query);
    return stmt.all(userId, cutoffDate.toISOString());
  }

  // Utility methods
  async backupDatabase(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const backupPath = this.getDatabasePath() + '.backup';
    this.db.backup(backupPath);
    
    return backupPath;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const dbService = new DatabaseService();

export function initDatabase(): void {
  dbService.initialize().catch(console.error);
  
  // IPC handlers for authentication
  ipcMain.handle('auth:register', async (_, email: string, name: string, password: string) => {
    const user = await dbService.registerUser(email, name, password);
    sessionStore.set('currentUserId', user.id);
    return user;
  });

  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    const user = await dbService.loginUser(email, password);
    sessionStore.set('currentUserId', user.id);
    return user;
  });

  ipcMain.handle('auth:logout', async () => {
    sessionStore.set('currentUserId', null);
    return true;
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    const userId = sessionStore.get('currentUserId');
    if (!userId) return null;
    return await dbService.getUserById(userId);
  });

  // IPC handlers for database operations
  ipcMain.handle('db:getUser', async (_, email) => {
    return await dbService.getUser(email);
  });
  
  ipcMain.handle('db:createVideo', async (_, videoData) => {
    return await dbService.createVideo(videoData);
  });
  
  ipcMain.handle('db:getVideos', async (_, userId) => {
    return await dbService.getVideos(userId);
  });
  
  ipcMain.handle('db:getVideo', async (_, videoId) => {
    return await dbService.getVideo(videoId);
  });
  
  ipcMain.handle('db:updateVideo', async (_, videoId, updates) => {
    return await dbService.updateVideo(videoId, updates);
  });
  
  ipcMain.handle('db:deleteVideo', async (_, videoId) => {
    return await dbService.deleteVideo(videoId);
  });
  
  ipcMain.handle('db:createSocialAccount', async (_, accountData) => {
    return await dbService.createSocialAccount(accountData);
  });
  
  ipcMain.handle('db:getSocialAccounts', async (_, userId) => {
    return await dbService.getSocialAccounts(userId);
  });
  
  ipcMain.handle('db:createScheduledPost', async (_, postData) => {
    return await dbService.createScheduledPost(postData);
  });
  
  ipcMain.handle('db:getScheduledPosts', async (_, userId, status, limit) => {
    return await dbService.getScheduledPosts(userId, status, limit);
  });
  
  ipcMain.handle('db:getScheduledPost', async (_, postId) => {
    return await dbService.getScheduledPost(postId);
  });
  
  ipcMain.handle('db:updateScheduledPost', async (_, postId, updates) => {
    return await dbService.updateScheduledPost(postId, updates);
  });
  
  ipcMain.handle('db:createAnalytics', async (_, analyticsData) => {
    return await dbService.createAnalytics(analyticsData);
  });
  
  ipcMain.handle('db:getAnalytics', async (_, postId) => {
    return await dbService.getAnalytics(postId);
  });
  
  ipcMain.handle('db:getAnalyticsSummary', async (_, userId, days) => {
    return await dbService.getAnalyticsSummary(userId, days);
  });
  
  ipcMain.handle('db:backupDatabase', async () => {
    return await dbService.backupDatabase();
  });
}