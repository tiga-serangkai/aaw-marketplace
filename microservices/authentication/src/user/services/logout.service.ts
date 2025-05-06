import { InternalServerErrorResponse } from "@src/commons/patterns";
import { AuthCacheService } from '@src/utils/cache';

export const logoutService = async (userId: string) => {
    try {
        const cacheService = AuthCacheService.getInstance();
        
        // Invalidate the cached token
        await cacheService.invalidateToken(userId);

        return {
            data: {
                message: "Successfully logged out"
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
} 