import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllOrders } from "../dao/getAllOrders.dao";
import { User } from '@type/user'
import { OrderCacheService } from '@src/utils/cache';

export const getAllOrdersService = async (
    user: User
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            throw new Error("SERVER_TENANT_ID is not defined");
        }

        if (!user.id) {
            return new InternalServerErrorResponse("User ID is not defined").generate();
        }

        // Try to get from cache first
        const cacheService = OrderCacheService.getInstance();
        const cachedOrders = await cacheService.getOrderList(SERVER_TENANT_ID, user.id);
        if (cachedOrders) {
            return {
                data: cachedOrders,
                status: 200,
            }
        }

        // If not in cache, get from database
        const orders = await getAllOrders(SERVER_TENANT_ID, user.id);

        // Store in cache
        await cacheService.cacheOrderList(SERVER_TENANT_ID, user.id, orders);

        return {
            data: orders,
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}