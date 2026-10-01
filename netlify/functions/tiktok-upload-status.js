const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tiktok-tokens";

const STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

function html(body) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1">
<title>Khalim Football — TikTok Status</title>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  margin: 0;
  padding: 25px;
  color: #111;
}

.container {
  max-width: 700px;
  margin: auto;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 16px;
  margin-top: 8px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 17px;
}

button {
  width: 100%;
  padding: 18px;
  margin-top: 20px;
  border: 0;
  border-radius: 14px;
  font-size: 19px;
  background: #eee;
}

#result {
  margin-top: 25px;
  padding: 20px;
  background: #f3f3f3;
  border-radius: 12px;
  font-size: 18px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
</head>

<body>

<div class="container">

<h1>🎬 Khalim Football</h1>

<h2>Статус TikTok Upload</h2>

<label>Ключ администратора</label>

<input
  id="adminKey"
  type="password"
  placeholder="CONTENT_ADMIN_KEY"
>

<label style="display:block;margin-top:20px;">
Publish ID
</label>

<input
  id="publishId"
  type="text"
  value="v_inbox_file~v2.7691829274747177012"
>

<button onclick="checkStatus()">
🔍 Проверить статус
</button>

<div id="result">
Ожидание...
</div>

</div>

<script>

async function checkStatus() {

  const result =
    document.getElementById("result");

  const adminKey =
    document.getElementById("adminKey").value.trim();

  const publishId =
    document.getElementById("publishId").value.trim();

  if (!adminKey) {
    result.textContent =
      "❌ Введите ключ администратора.";
    return;
  }

  if (!publishId) {
    result.textContent =
      "❌ Введите Publish ID.";
    return;
  }

  result.textContent =
    "⏳ Проверяем статус TikTok...";

  try {

    const response =
      await fetch(
        window.location.href,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Content-Key":
              adminKey
          },

          body: JSON.stringify({
            publish_id: publishId
          })
        }
      );

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(
        "Некорректный ответ сервера:\n" +
        text
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Ошибка проверки статуса."
      );
    }

    const status =
      data.status || "UNKNOWN";

    let message = "";

    if (status === "PROCESSING_UPLOAD") {

      message =
        "⏳ ВИДЕО ОБРАБАТЫВАЕТСЯ\n\n" +
        "TikTok получил файл и обрабатывает его.";

    } else if (status === "SEND_TO_USER_INBOX") {

      message =
        "📥 ВИДЕО ОТПРАВЛЕНО В TIKTOK INBOX\n\n" +
        "Открой TikTok и проверь уведомление.\n" +
        "Видео нужно открыть в TikTok и завершить публикацию через редактор.";

    } else if (status === "PUBLISH_COMPLETE") {

      message =
        "✅ ПУБЛИКАЦИЯ ЗАВЕРШЕНА\n\n" +
        "TikTok сообщает, что публикация завершена.";

    } else if (status === "FAILED") {

      message =
        "❌ TIKTOK СООБЩИЛ ОБ ОШИБКЕ\n\n" +
        "Причина:\n" +
        (data.fail_reason || "не указана");

    } else {

      message =
        "ℹ️ СТАТУС: " +
        status;
    }

    result.textContent =
      message +
      "\n\n" +
      "Publish ID:\n" +
      publishId +
      "\n\n" +
      "Uploaded bytes:\n" +
      (data.uploaded_bytes ?? "—") +
      "\n\n" +
      "Post ID:\n" +
      (
        data.publicaly_available_post_id &&
        data.publicaly_available_post_id.length
          ? data.publicaly_available_post_id.join(", ")
          : "—"
      );

  } catch (error) {

    result.textContent =
      "❌ ОШИБКА\n\n" +
      (error.message || String(error));
  }
}

</script>

</body>
</html>
`;
}


async function getTikTokToken() {

  const store =
    getStore(
      STORE_NAME,
      {
        siteID:
          process.env.SITE_ID,

        token:
          process.env.NETLIFY_AUTH_TOKEN
      }
    );

  const result =
    await store.list();

  if (
    !result ||
    !result.blobs ||
    !result.blobs.length
  ) {
    throw new Error(
      "TikTok аккаунт не подключён."
    );
  }

  const key =
    result.blobs[0].key;

  const data =
    await store.get(
      key,
      {
        type: "json"
      }
    );

  if (
    !data ||
    !data.access_token
  ) {
    throw new Error(
      "TikTok access token не найден."
    );
  }

  return data.access_token;
}


exports.handler =
  async (event) => {

    try {

      /*
       * GET
       */

      if (
        event.httpMethod === "GET"
      ) {

        return {
          statusCode: 200,

          headers: {
            "Content-Type":
              "text/html; charset=UTF-8",

            "Cache-Control":
              "no-cache"
          },

          body: html("")
        };
      }


      /*
       * POST
       */

      if (
        event.httpMethod !== "POST"
      ) {

        return {
          statusCode: 405,

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            error:
              "Method not allowed"
          })
        };
      }


      /*
       * Проверка admin key
       */

      const providedKey =
        event.headers["x-content-key"] ||
        event.headers["X-Content-Key"];

      if (
        !providedKey ||
        providedKey !==
          process.env.CONTENT_ADMIN_KEY
      ) {

        return {
          statusCode: 401,

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            error:
              "Unauthorized"
          })
        };
      }


      /*
       * JSON
       */

      let body;

      try {

        body =
          JSON.parse(
            event.body || "{}"
          );

      } catch (error) {

        return {
          statusCode: 400,

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            error:
              "Invalid JSON"
          })
        };
      }


      const publishId =
        String(
          body.publish_id || ""
        ).trim();


      if (!publishId) {

        return {
          statusCode: 400,

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            error:
              "publish_id is required"
          })
        };
      }


      /*
       * Получаем TikTok access token
       */

      const accessToken =
        await getTikTokToken();


      /*
       * Запрос статуса TikTok
       */

      const response =
        await fetch(
          STATUS_URL,
          {
            method: "POST",

            headers: {
              "Authorization":
                "Bearer " +
                accessToken,

              "Content-Type":
                "application/json; charset=UTF-8"
            },

            body: JSON.stringify({
              publish_id:
                publishId
            })
          }
        );


      const data =
        await response.json();


      /*
       * Ошибка TikTok API
       */

      if (
        !response.ok ||
        !data.error ||
        data.error.code !== "ok"
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

            error:
              data.error?.message ||
              "TikTok status request failed",

            error_code:
              data.error?.code ||
              "unknown",

            log_id:
              data.error?.log_id ||
              null
          })
        };
      }


      /*
       * Успешный ответ
       */

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-cache"
        },

        body: JSON.stringify({
          success: true,

          publish_id:
            publishId,

          status:
            data.data?.status ||
            "UNKNOWN",

          fail_reason:
            data.data?.fail_reason ||
            null,

          uploaded_bytes:
            data.data?.uploaded_bytes ||
            0,

          publicly_available_post_id:
            data.data
              ?.publicaly_available_post_id ||
            []
        })
      };

    } catch (error) {

      console.error(
        "TikTok status error:",
        error
      );

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
            "Server error"
        })
      };
    }
  };
