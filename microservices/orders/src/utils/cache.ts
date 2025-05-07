import { redis } from '../config/redis';

export class OrderCacheService {
    private static instance: OrderCacheService;
    private readonly orderListTTL: number = 300; // 5 minutes in seconds
    private readonly orderDetailTTL: number = 3600; // 1 hour in seconds

    private constructor() {}

    public static getInstance(): OrderCacheService {
        if (!OrderCacheService.instance) {
            OrderCacheService.instance = new OrderCacheService();
        }
        return OrderCacheService.instance;
    }

    // Cache order list
    async cacheOrderList(tenantId: string, userId: string, data: any): Promise<void> {
        const key = `orders:list:${tenantId}:${userId}`;
        await redis.set(key, JSON.stringify(data), 'EX', this.orderListTTL);
    }

    // Get cached order list
    async getOrderList(tenantId: string, userId: string): Promise<any | null> {
        const key = `orders:list:${tenantId}:${userId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    // Cache order detail
    async cacheOrderDetail(tenantId: string, orderId: string, data: any): Promise<void> {
        const key = `orders:detail:${tenantId}:${orderId}`;
        await redis.set(key, JSON.stringify(data), 'EX', this.orderDetailTTL);
    }

    // Get cached order detail
    async getOrderDetail(tenantId: string, orderId: string): Promise<any | null> {
        const key = `orders:detail:${tenantId}:${orderId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    // Invalidate order list cache
    async invalidateOrderList(tenantId: string, userId: string): Promise<void> {
        const key = `orders:list:${tenantId}:${userId}`;
        await redis.del(key);
    }

    // Invalidate order detail cache
    async invalidateOrderDetail(tenantId: string, orderId: string): Promise<void> {
        const key = `orders:detail:${tenantId}:${orderId}`;
        await redis.del(key);
    }

    // Invalidate all order caches for a user
    async invalidateAllUserOrderCaches(tenantId: string, userId: string): Promise<void> {
        const keys = await redis.keys(`orders:*:${tenantId}:${userId}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }

    async get<T>(key: string): Promise<T | null> {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Cache get error:', error);
        return null;
      }
    }
    
    async set(key: string, value: any, ttl: number = this.orderListTTL): Promise<void> {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
      } catch (error) {
        console.error('Cache set error:', error);
      }
    }
} 