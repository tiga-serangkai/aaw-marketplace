import { InternalServerErrorResponse } from "@src/commons/patterns"
import { getAllProductsByTenantId } from "../dao/getAllProductsByTenantId.dao";
import { CacheService } from "@src/utils/cache";

export const getAllProductsService = async (page_number: number = 1, page_size: number = 10) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate()
        }

        page_size = Number(page_size) || 10;

        // Validate page_size
        if (page_size !== 10) {
            return {
                status: 400,
                data: {
                    message: "Invalid page_size. Only page_size=10 is allowed.",
                },
            };
        }

        page_number = Number(page_number) || 1;

        // Calculate offset and limit for pagination
        const offset = (page_number - 1) * 10;
        const limit = 10;

        const cacheService = CacheService.getInstance();
        const cacheKeyPrefix = `products:${SERVER_TENANT_ID}`;
        const cacheKey = `${cacheKeyPrefix}:page:${page_number}:size:${page_size}`;
        const totalCountCacheKey = `${cacheKeyPrefix}:totalCount`;

        // Try to get paginated results from cache
        const cachedProducts = await cacheService.get(cacheKey);
        let totalProducts = await cacheService.get(totalCountCacheKey);

        if (Array.isArray(cachedProducts) && totalProducts !== null) {
            return {
                data: {
                    products:cachedProducts,
                    page_number,
                    page_size: 10,
                },
                status: 200,
            };
        }

        // If not in cache, get from database
        const products = await getAllProductsByTenantId(SERVER_TENANT_ID, limit, offset);
        

        // Cache the paginated results
        await cacheService.set(cacheKey, products, 1800); // Cache for 30 minutes

        // If no products found for the given page
        if (products.length === 0 && page_number > 1) {
            return {
                data: {
                    products,
                    page_number,
                    page_size: 10,
                },
                status: 200,
                message: "No products found for the given page"
            };
        }

        return {
            data: {
                products,
                page_number,
                page_size: 10, 
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}