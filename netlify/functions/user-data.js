// netlify/functions/user-data.js (DEBUG VERSION)

const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
    console.log("--- Function user-data invoked ---");
    console.log("HTTP Method:", event.httpMethod);

    try {
        const user = context.clientContext && context.clientContext.user;
        const guestId = event.queryStringParameters.id;
        
        console.log("Netlify User Context:", user ? `User found (sub: ${user.sub})` : "No Netlify user context.");
        console.log("Guest ID from query params:", guestId);

        const userId = user ? user.sub : guestId;

        if (!userId) {
            console.error("Authorization Error: No userId (user.sub or guestId) found.");
            return { statusCode: 401, body: "Unauthorized: User or Guest ID is required." };
        }

        console.log("Final User/Guest ID for Blob Store:", userId);

        const userDataStore = getStore("userData");

        if (event.httpMethod === "GET") {
            console.log("Executing GET...");
            const data = await userDataStore.get(userId, { type: "json" });
            console.log("Data fetched from Blobs:", data);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data || { favorites: [], mistakes: [] }),
            };
        }

        if (event.httpMethod === "POST") {
            console.log("Executing POST...");
            const newUserData = JSON.parse(event.body);
            console.log("Data to be saved to Blobs:", newUserData);
            await userDataStore.setJSON(userId, newUserData);
            console.log("Data successfully saved for userId:", userId);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: true }),
            };
        }

        return { statusCode: 405, body: "Method Not Allowed" };

    } catch (error) {
        console.error("---!!! UNCAUGHT FUNCTION ERROR !!!---");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};