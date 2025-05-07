import { InternalServerErrorResponse, NotFoundResponse, UnauthorizedResponse } from "@src/commons/patterns"
import { deleteTenantById } from "../dao/deleteTenantById.dao";
import { User } from "@type/user";
import { getTenantById } from "../dao/getTenantById.dao";
import { TenantCacheService } from "@src/utils/cache";

export const deleteTenantService = async (
    user: User,
    tenant_id: string
) => {
    try {
        const tenant_information = await getTenantById(tenant_id);
        if (!tenant_information) {
            return new NotFoundResponse('Tenant not found').generate()
        }

        if (tenant_information.tenants.owner_id !== user.id) {
            return new UnauthorizedResponse('You are not allowed to delete this tenant').generate()
        }

        const tenant = await deleteTenantById(tenant_id);
        if (!tenant) {
            return new NotFoundResponse('Tenant not found').generate()
        }

        // Invalidate caches
        const cacheService = TenantCacheService.getInstance();
        await cacheService.del(`tenant:${tenant_id}`);

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