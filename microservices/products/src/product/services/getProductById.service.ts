import { InternalServerErrorResponse } from "@src/commons/patterns"
import { getProductById } from "../dao/getProductById.dao";
import { CacheService } from "@src/utils/cache";

export const getProductByIdService = async (
    id: string,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate()
        }

        const cacheService = CacheService.getInstance();
        const cacheKey = `product:${SERVER_TENANT_ID}:${id}`;

        // Try to get from cache first
        const cachedProduct = await cacheService.get(cacheKey);
        if (cachedProduct) {
            return {
                data: cachedProduct,
                status: 200
            }
        }

        // If not in cache, get from database
        const product = await getProductById(SERVER_TENANT_ID, id);
        
        // Store in cache if product exists
        if (product) {
            await cacheService.set(cacheKey, product);
        }

        return {
            data: {
                ...product
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}