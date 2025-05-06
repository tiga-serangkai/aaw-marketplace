import { InternalServerErrorResponse, NotFoundResponse, UnauthorizedResponse } from "@src/commons/patterns";
import { getOrderById } from "../dao/getOrderById.dao";
import { getOrderDetail } from "../dao/getOrderDetail.dao";
import { User } from "@type/user";
import { OrderCacheService } from '@src/utils/cache';

export const getOrderDetailService = async (
    user: User,
    order_id: string,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            throw new Error("SERVER_TENANT_ID is not defined");
        }

        if (!user.id) {
            return new InternalServerErrorResponse("User ID is not defined").generate();
        }

        if (!order_id) {
            return new InternalServerErrorResponse("Order ID is not defined").generate();
        }

        // Try to get from cache first
        const cacheService = OrderCacheService.getInstance();
        const cachedOrderDetail = await cacheService.getOrderDetail(SERVER_TENANT_ID, order_id);
        if (cachedOrderDetail) {
            // Verify user authorization
            const order = await getOrderById(SERVER_TENANT_ID, user.id, cachedOrderDetail.order_id);
            if (!order) {
                return new NotFoundResponse("Order not found").generate();
            }
            if (order.user_id !== user.id) {
                return new UnauthorizedResponse("User is not authorized").generate();
            }
            return {
                data: {
                    ...cachedOrderDetail,
                },
                status: 200,
            }
        }

        // If not in cache, get from database
        const orderDetail = await getOrderDetail(SERVER_TENANT_ID, order_id);
        if (!orderDetail) {
            return new NotFoundResponse("Order detail not found").generate();
        }

        const order = await getOrderById(SERVER_TENANT_ID, user.id, orderDetail?.order_id);
        if (!order) {
            return new NotFoundResponse("Order not found").generate();
        }
        if (order.user_id !== user.id) {
            return new UnauthorizedResponse("User is not authorized").generate();
        }

        // Store in cache
        await cacheService.cacheOrderDetail(SERVER_TENANT_ID, order_id, orderDetail);

        return {
            data: {
                ...orderDetail,
            },
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}