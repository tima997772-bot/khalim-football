const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const keys = await store.list();

    if (!keys.blobs || keys.blobs.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: "<h1>Токен не найден</h1><p>В Netlify Blobs пока нет сохранённого TikTok токена.</p>"
      };
    }

    const key = keys.blobs[0].key;

    const tokenData = await store.get(key, {
      type: "json"
    });

    if (!tokenData || !tokenData.access_token) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: "<h1>Access token не найден</h1>"
      };
    }

    const response = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok || data.error?.code !== "ok") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(data, null, 2)
      };
    }

    const user = data.data?.user || {};

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: `
        <h1>TikTok API работает</h1>

        <p><strong>Подключение:</strong> успешно</p>
        <p><strong>Open ID:</strong> сохранён</p>
        <p><strong>Имя:</strong> ${user.display_name || "—"}</p>
        <p><strong>Подписчики:</strong> ${user.follower_count ?? "—"}</p>
        <p><strong>Подписки:</strong> ${user.following_count ?? "—"}</p>
        <p><strong>Лайки:</strong> ${user.likes_count ?? "—"}</p>
        <p><strong>Видео:</strong> ${user.video_count ?? "—"}</p>
      `
    };

  } catch (error) {
    console.error("TikTok API test error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: `
        <h1>Ошибка теста TikTok API</h1>
        <p>${error.message || "Unknown error"}</p>
      `
    };
  }
};
