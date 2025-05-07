import { InternalServerErrorResponse } from "@src/commons/patterns";
import { getAllOrders } from "../dao/getAllOrders.dao";
import { User } from '@type/user'
import { OrderCacheService } from '@src/utils/cache';

export const getAllOrdersService = async (
    user: User,
    page_number: number = 1,
    page_size: number = 10,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            throw new Error("SERVER_TENANT_ID is not defined");
        }

        if (!user.id) {
            return new InternalServerErrorResponse("User ID is not defined").generate();
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

        // Try to get from cache first
        const cacheService = OrderCacheService.getInstance();
        const cacheKey = `orders:${SERVER_TENANT_ID}:${user.id}:page:${page_number}:size:${page_size}`;
        
        // Try to get paginated results from cache
        const cachedOrders = await cacheService.get(cacheKey);
        if (Array.isArray(cachedOrders)) {
            return {
                data: {
                    orders: cachedOrders,
                    page_number,
                    page_size,
                },
                status: 200,
            };
        }
        
        // If not in cache, get from database
        const orders = await getAllOrders(SERVER_TENANT_ID, user.id, limit, offset);
        
        // Store paginated results in cache
        await cacheService.set(cacheKey, orders, 1800); // Cache for 30 minutes        

        // If no orders found for the given page
        if (orders.length === 0 && page_number > 1) {
            return {
                data: {
                    orders,
                    page_number,
                    page_size: 10,
                },
                status: 200,
            };
        }

        return {
            data: {
                orders, 
                page_number, 
                page_size: 10
            },
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}