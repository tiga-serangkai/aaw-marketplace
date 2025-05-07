import { InternalServerErrorResponse, NotFoundResponse } from "@src/commons/patterns"
import { getTenantById } from "../dao/getTenantById.dao";
import { TenantCacheService } from "@src/utils/cache";

export const getTenantService = async (
    tenant_id: string
) => {
    try {
        const cacheService = TenantCacheService.getInstance();
        const cacheKey = `tenant:${tenant_id}`;

        // Try to get from cache first
        const cachedProduct = await cacheService.get(cacheKey);
        if (cachedProduct) {
            return {
                data: cachedProduct,
                status: 200
            }
        }

        // If not in cache, get from database
        const tenant = await getTenantById(tenant_id);
        if (!tenant) {
            return new NotFoundResponse('Tenant not found').generate()
        }

        // Store in cache if tenant exists
        if (tenant) {
            await cacheService.set(cacheKey, tenant);
        }

        return {
            data: {
                ...tenant
            },
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}