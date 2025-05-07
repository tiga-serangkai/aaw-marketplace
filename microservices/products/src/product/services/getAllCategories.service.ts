import { InternalServerErrorResponse } from "@src/commons/patterns"
import { getAllCategoriesByTenantId } from "../dao/getAllCategoriesByTenantId.dao";

export const getAllCategoriesService = async (page_number: number = 1, page_size: number = 10) => {
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

        const categories = await getAllCategoriesByTenantId(SERVER_TENANT_ID, limit, offset);

        // If no categories found for the given page
        if (categories.length === 0 && page_number > 1) {
            return {
                data: {
                    categories: [],
                    page_number,
                    page_size: 10,
                },
                status: 200,
            };
        }

        return {
            data: {
                categories,
                page_number,
                page_size: 10,
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate()
    }
}