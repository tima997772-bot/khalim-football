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
          error: "Method not allowed. Use POST."
        })
      };
    }

    // =========================
    // Проверяем админский ключ
    // =========================

    const adminKey =
      process.env.CONTENT_ADMIN_KEY;

    const providedKey =
      event.headers["x-content-key"] ||
      event.headers["X-Content-Key"];

    if (
      !adminKey ||
      providedKey !== adminKey
    ) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          error: "Unauthorized"
        })
      };
    }

    // =========================
    // Получаем TikTok token
    // =========================

    const store = getStore(
      "tiktok-tokens",
      {
        siteID:
          process.env.SITE_ID,

        token:
          process.env.NETLIFY_AUTH_TOKEN
      }
    );

    const keys =
      await store.list();

    if (
      !keys.blobs ||
      keys.blobs.length === 0
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          success: false,
          error:
            "TikTok account is not connected."
        })
      };
    }

    const tokenData =
      await store.get(
        keys.blobs[0].key,
        {
          type: "json"
        }
      );

    if (
      !tokenData ||
      !tokenData.access_token
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          success: false,
          error:
            "TikTok access token not found."
        })
      };
    }

    // =========================
    // ВАЖНО
    //
    // Пока это только тест API.
    // Видео в TikTok НЕ отправляем.
    // Проверяем наличие авторизации
    // и разрешения video.upload.
    // =========================

    const response =
      await fetch(
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${tokenData.access_token}`,

            "Content-Type":
              "application/json; charset=UTF-8"
          },

          body: JSON.stringify({
            source_info: {
              source:
                "FILE_UPLOAD",

              video_size:
                4000000,

              chunk_size:
                4000000,

              total_chunk_count:
                1
            }
          })
        }
      );

    const data =
      await response.json();

    // =========================
    // TikTok ошибка
    // =========================

    if (
      !response.ok ||
      data.error?.code !== "ok"
    ) {
      return {
        statusCode:
          response.status || 400,

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          success: false,

          tiktok_error:
            data.error?.code ||
            "unknown_error",

          message:
            data.error?.message ||
            "TikTok API error",

          log_id:
            data.error?.log_id ||
            null
        })
      };
    }

    // =========================
    // Успешный init
    // =========================

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        success: true,

        message:
          "TikTok upload initialization successful.",

        publish_id:
          data.data?.publish_id ||
          null,

        upload_url_received:
          Boolean(
            data.data?.upload_url
          ),

        scope:
          "video.upload",

        next_step:
          "The upload_url is valid for one hour. A real video file must be uploaded with PUT."
      })
    };

  } catch (error) {

    console.error(error);

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        success: false,

        error:
          error.message ||
          "Unknown server error"
      })
    };
  }
};
