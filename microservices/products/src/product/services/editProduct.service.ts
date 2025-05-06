import { InternalServerErrorResponse } from "@src/commons/patterns";
import { editProductById } from "../dao/editProductById.dao";
import { CacheService } from "@src/utils/cache";

export const editProductService = async (
    id: string,
    name?: string,
    description?: string,
    price?: number,
    quantity_available?: number,
    category_id?: string,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Server Tenant ID not found').generate()
        }

        const product = await editProductById(SERVER_TENANT_ID, id, {
            name,
            description,
            price,
            quantity_available,
            category_id,
        })

        // Invalidate caches
        const cacheService = CacheService.getInstance();
        await cacheService.del(`product:${SERVER_TENANT_ID}:${id}`);
        await cacheService.del(`products:all:${SERVER_TENANT_ID}`);
        
        // If category is changed, invalidate both old and new category caches
        if (category_id) {
            await cacheService.del(`products:category:${SERVER_TENANT_ID}:${category_id}`);
        }

        return {
            data: product,
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}