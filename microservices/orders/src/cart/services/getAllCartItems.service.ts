import { InternalServerErrorResponse, NotFoundResponse } from "@src/commons/patterns";
import { getAllCartItems } from "../dao/getAllCartItems.dao";
import { User } from "@type/user";

export const getAllCartItemsService = async (
    user: User,
    page_number: number = 1,
    page_size: number = 10
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse('Tenant ID not found').generate();
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

        if (!user.id) {
            return new NotFoundResponse('User not found').generate();
        }

        const items = await getAllCartItems(SERVER_TENANT_ID, user.id, limit, offset);

        // If no items found for the given page
        if (items.length === 0 && page_number > 1) {
            return {
                data: {
                    items,
                    page_number,
                    page_size: 10,
                },
                status: 200,
            };
        }

        return {
            data: {
                items,
                page_number,
                page_size: 10,
            },
            status: 200,
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}