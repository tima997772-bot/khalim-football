const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          error: "Method not allowed"
        })
      };
    }

    const adminKey = process.env.CONTENT_ADMIN_KEY;

    if (!adminKey) {
      return {
        statusCode: 500,
        body: "CONTENT_ADMIN_KEY is not configured"
      };
    }

    const providedKey =
      event.headers["x-content-key"] ||
      event.headers["X-Content-Key"];

    if (providedKey !== adminKey) {
      return {
        statusCode: 401,
        body: "Unauthorized"
      };
    }

    const body = JSON.parse(event.body || "{}");

    const id = Number(body.id);
    const status = body.status;

    const allowedStatuses = [
      "Снять",
      "Готово",
      "Опубликовано"
    ];

    if (!id || !allowedStatuses.includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid id or status"
        })
      };
    }

    const store = getStore("content-queue", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const queue = await store.get("queue", {
      type: "json"
    });

    if (!queue || !Array.isArray(queue.items)) {
      return {
        statusCode: 404,
        body: "Content queue not found"
      };
    }

    const item = queue.items.find(
      (content) => Number(content.id) === id
    );

    if (!item) {
      return {
        statusCode: 404,
        body: "Content item not found"
      };
    }

    item.status = status;
    item.updated_at = new Date().toISOString();

    await store.setJSON("queue", queue);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        success: true,
        item
      })
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: `Server error: ${error.message}`
    };
  }
};
