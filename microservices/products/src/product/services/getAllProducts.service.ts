import { InternalServerErrorResponse } from "@src/commons/patterns"
import { getAllProductsByTenantId } from "../dao/getAllProductsByTenantId.dao";
import { CacheService } from "@src/utils/cache";

export const getAllProductsService = async () => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate()
        }

        const cacheService = CacheService.getInstance();
        const cacheKey = `products:all:${SERVER_TENANT_ID}`;

        // Try to get from cache first
        const cachedProducts = await cacheService.get(cacheKey);
        if (cachedProducts) {
            return {
                data: {
                    products: cachedProducts
                },
                status: 200
            }
        }

        // If not in cache, get from database
        const products = await getAllProductsByTenantId(SERVER_TENANT_ID);

        // Store in cache
        await cacheService.set(cacheKey, products);

        return {
            data: {
                products
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}