// netlify/functions/user-data.js
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    // 确保用户已登录 (无论是注册用户还是游客)
    // context.netlify.identity.user 是 Netlify 自动注入的
    const user = context.netlify.identity.user;
    if (!user) {
        return new Response("You must be logged in.", { status: 401 });
    }
    
    // 使用用户的 sub (subject) 作为唯一的 key，这是用户的永久ID
    const userId = user.sub; 
    const userDataStore = getStore("userData");

    // 根据请求方法处理
    if (req.method === "GET") {
        // 获取用户数据
        const data = await userDataStore.get(userId, { type: "json" });
        return new Response(JSON.stringify(data || { favorites: [], mistakes: [] }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (req.method === "POST") {
        // 更新用户数据
        const newUserData = await req.json();
        await userDataStore.setJSON(userId, newUserData);
        return new Response(JSON.stringify({ success: true, data: newUserData }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // 如果是其他方法，则不允许
    return new Response("Method Not Allowed", { status: 405 });
};