import { InternalServerErrorResponse } from "@src/commons/patterns";

export const logoutService = async (userId: string) => {
    try {

        return {
            data: {
                message: "Successfully logged out"
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
} 