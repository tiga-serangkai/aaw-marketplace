import { redis } from './config/redis';

async function testRedis() {
    try {
        // Test set
        await redis.set('test-key', 'Hello Redis!');
        console.log('✅ Successfully set test-key');

        // Test get
        const value = await redis.get('test-key');
        console.log('✅ Successfully got test-key:', value);

        // Test delete
        await redis.del('test-key');
        console.log('✅ Successfully deleted test-key');

        // Close connection
        await redis.quit();
        console.log('✅ Redis connection closed');
    } catch (error) {
        console.error('❌ Redis test failed:', error);
    }
}

testRedis(); 