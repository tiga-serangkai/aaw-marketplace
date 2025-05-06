import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByUsername } from '../dao/getUserByUsername.dao';
import { InternalServerErrorResponse, NotFoundResponse } from "@src/commons/patterns"
import { User } from '@db/schema/users';
import { AuthCacheService } from '@src/utils/cache';

export const loginService = async (
    username: string,
    password: string
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse("Server tenant ID is missing").generate();
        }

        const cacheService = AuthCacheService.getInstance();

        // Check if user is blocked due to too many failed attempts
        const isBlocked = await cacheService.isUserBlocked(username);
        if (isBlocked) {
            return new NotFoundResponse("Account temporarily blocked. Please try again later.").generate();
        }

        const user: User = await getUserByUsername(
            username,
            SERVER_TENANT_ID,
        );
        if (!user) {
            await cacheService.cacheFailedLoginAttempt(username);
            return new NotFoundResponse("User not found").generate();
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            await cacheService.cacheFailedLoginAttempt(username);
            return new NotFoundResponse("Invalid password").generate();
        }

        // Reset failed login attempts on successful login
        await cacheService.resetFailedLoginAttempts(username);

        const payload = {
            id: user.id,
            tenant_id: user.tenant_id,
        }
        const secret: string = process.env.JWT_SECRET as string;
        const token = jwt.sign(payload, secret, {
            expiresIn: "1d",
        })

        // Cache the token
        await cacheService.cacheToken(user.id, token);

        return {
            data: {
                token,
            },
            status: 200
        }
    } catch (err: any) {
        return new InternalServerErrorResponse(err).generate();
    }
}