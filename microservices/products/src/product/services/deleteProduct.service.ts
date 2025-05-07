import { InternalServerErrorResponse } from "@src/commons/patterns"
import { deleteProductById } from "../dao/deleteProductById.dao";
import { CacheService } from "@src/utils/cache";

export const deleteProductService = async (
    id: string,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate();
        }

        const product = await deleteProductById(SERVER_TENANT_ID, id);

        // Invalidate caches
        const cacheService = CacheService.getInstance();
        await cacheService.del(`product:${SERVER_TENANT_ID}:${id}`);
        await cacheService.del(`product:all:${SERVER_TENANT_ID}`);
        if (product?.category_id) {
            await cacheService.del(`product:category:${SERVER_TENANT_ID}:${product.category_id}`);
        }

        return {
            data: {
                ...product,
            },
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}