export const healthCheckService = async () => {
    return {
        status: 200, // HTTP status code
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
        },
    };
};