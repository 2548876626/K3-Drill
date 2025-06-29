// netlify/functions/user-data.js

const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
    const user = context.clientContext && context.clientContext.user;
    
    // 从查询参数获取 guestId (针对游客模式)
    const guestId = event.queryStringParameters.id;
    // 使用真实用户的 sub 或游客的 ID 作为 key
    const userId = user ? user.sub : guestId;

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
            // 如果 get 操作因为 key 不存在而出错 (某些存储会这样)，则返回空
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
            const newUserData = JSON.parse(event.body);
            await userDataStore.setJSON(userId, newUserData);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: true }),
            };
        } catch (error) {
            return { statusCode: 500, body: error.toString() };
        }
    }

    return { statusCode: 405, body: "Method Not Allowed" };
};