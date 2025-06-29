// netlify/functions/user-data.js

const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
    // 优先从认证的上下文中获取用户ID (针对注册用户)
    const user = context.clientContext && context.clientContext.user;
    let userId = user ? user.sub : null;

    // 如果没有认证用户，则尝试从URL的查询参数中获取ID (针对游客)
    if (!userId) {
        userId = event.queryStringParameters.id;
    }

    // 如果两种方式都获取不到ID，则拒绝访问
    if (!userId) {
        return { statusCode: 401, body: "Unauthorized: User or Guest ID is required." };
    }
    
    const userDataStore = getStore("userData");

    if (event.httpMethod === "GET") {
        try {
            const data = await userDataStore.get(userId, { type: "json" });
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data || { favorites: [], mistakes: [] }),
            };
        } catch (error) {
            if (error.name === 'BlobNotFoundError') {
                 return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ favorites: [], mistakes: [] }),
                };
            }
            return { statusCode: 500, body: error.toString() };
        }
    }

    if (event.httpMethod === "POST") {
        try {
            // 确保有请求体
            if (!event.body) throw new Error("Request body is empty.");
            const newUserData = JSON.parse(event.body);
            await userDataStore.setJSON(userId, newUserData);
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        } catch (error) {
            return { statusCode: 500, body: error.toString() };
        }
    }

    return { statusCode: 405, body: "Method Not Allowed" };
};