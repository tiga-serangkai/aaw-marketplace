import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getManyProductDatasById } from "../dao/getManyProductDatasById.dao";
import { CacheService } from "@src/utils/cache";

export const getManyProductDatasByIdService = async (
    productIds: string[],
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate()
        }

        const cacheService = CacheService.getInstance();
        const cachedProducts: any[] = [];
        const missingProductIds: string[] = [];

        // Try to get each product from cache first
        for (const id of productIds) {
            const cacheKey = `product:${SERVER_TENANT_ID}:${id}`;
            const cachedProduct = await cacheService.get(cacheKey);
            
            if (cachedProduct) {
                cachedProducts.push(cachedProduct);
            } else {
                missingProductIds.push(id);
            }
        }

        // If we have missing products, fetch them from database
        let productsFromDb: any[] = [];
        if (missingProductIds.length > 0) {
            productsFromDb = await getManyProductDatasById(SERVER_TENANT_ID, missingProductIds);
            
            // Cache the newly fetched products
            for (const product of productsFromDb) {
                const cacheKey = `product:${SERVER_TENANT_ID}:${product.id}`;
                await cacheService.set(cacheKey, product);
            }
        }

        // Combine cached and database products
        const allProducts = [...cachedProducts, ...productsFromDb];

        return {
            data: allProducts,
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}