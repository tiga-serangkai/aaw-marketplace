import { redis } from '../config/redis';

export class AuthCacheService {
    private static instance: AuthCacheService;
    private readonly tokenTTL: number = 86400; // 1 day in seconds
    private readonly failedLoginTTL: number = 300; // 5 minutes
    private readonly maxFailedAttempts: number = 5;

    private constructor() {}

    public static getInstance(): AuthCacheService {
        if (!AuthCacheService.instance) {
            AuthCacheService.instance = new AuthCacheService();
        }
        return AuthCacheService.instance;
    }

    // Cache JWT token
    async cacheToken(userId: string, token: string): Promise<void> {
        const key = `auth:token:${userId}`;
        await redis.set(key, token, 'EX', this.tokenTTL);
    }

    // Get cached token
    async getToken(userId: string): Promise<string | null> {
        const key = `auth:token:${userId}`;
        return await redis.get(key);
    }

    // Invalidate token
    async invalidateToken(userId: string): Promise<void> {
        const key = `auth:token:${userId}`;
        await redis.del(key);
    }

    // Cache failed login attempts
    async cacheFailedLoginAttempt(username: string): Promise<void> {
        const key = `auth:failed_login:${username}`;
        const attempts = await redis.incr(key);
        if (attempts === 1) {
            await redis.expire(key, this.failedLoginTTL);
        }
    }

    // Get failed login attempts
    async getFailedLoginAttempts(username: string): Promise<number> {
        const key = `auth:failed_login:${username}`;
        const attempts = await redis.get(key);
        return attempts ? parseInt(attempts) : 0;
    }

    // Reset failed login attempts
    async resetFailedLoginAttempts(username: string): Promise<void> {
        const key = `auth:failed_login:${username}`;
        await redis.del(key);
    }

    // Check if user is blocked
    async isUserBlocked(username: string): Promise<boolean> {
        const attempts = await this.getFailedLoginAttempts(username);
        return attempts >= this.maxFailedAttempts;
    }
} 