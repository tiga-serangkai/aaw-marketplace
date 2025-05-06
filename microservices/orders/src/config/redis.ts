import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

console.log('Redis Config:', {
  host: redisConfig.host,
  port: redisConfig.port,
  tls: redisConfig.tls ? 'enabled' : 'disabled'
});

export const redis = new Redis(redisConfig);

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis Client Connected'));
redis.on('ready', () => console.log('Redis Client Ready'));
redis.on('reconnecting', () => console.log('Redis Client Reconnecting'));
redis.on('end', () => console.log('Redis Client Connection Ended'));

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing Redis connection...');
    await redis.quit();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Closing Redis connection...');
    await redis.quit();
    process.exit(0);
}); 