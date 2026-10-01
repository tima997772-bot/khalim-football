const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tiktok-tokens";

const STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function page(message = "", publishId = "") {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>Khalim Football — TikTok Status</title>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  margin: 0;
  padding: 25px;

  color: #111;
  background: #fff;
}

.container {
  max-width: 700px;
  margin: auto;
}

h1 {
  font-size: 38px;
  margin-bottom: 35px;
}

h2 {
  font-size: 30px;
  margin-bottom: 35px;
}

label {
  display: block;
  font-size: 20px;
  margin-top: 22px;
  margin-bottom: 8px;
}

input {
  width: 100%;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font-size: 17px;
}

button {
  width: 100%;
  padding: 19px;
  margin-top: 25px;

  border: 0;
  border-radius: 15px;

  font-size: 20px;

  background: #eeeeee;
  color: #111;
}

.result {
  margin-top: 25px;
  padding: 22px;

  background: #f3f3f3;
  border-radius: 14px;

  font-size: 19px;
  line-height: 1.55;

  white-space: pre-wrap;
  word-break: break-word;
}
</style>
</head>

<body>

<div class="container">

<h1>🎬 Khalim Football</h1>

<h2>Статус TikTok Upload</h2>

<form method="POST">

<label>
Ключ администратора
</label>

<input
  type="password"
  name="admin_key"
  placeholder="CONTENT_ADMIN_KEY"
  required
>

<label>
Publish ID
</label>

<input
  type="text"
  name="publish_id"
  value="${escapeHtml(publishId)}"
  required
>

<button type="submit">
🔍 Проверить статус
</button>

</form>

${
  message
    ? `<div class="result">${message}</div>`
    : `<div class="result">Ожидание...</div>`
}

</div>

</body>
</html>
`;
}


async function getTikTokToken() {

  const store = getStore(
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


exports.handler = async (event) => {

  try {

    /*
     * GET
     */

    if (event.httpMethod === "GET") {

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8",

          "Cache-Control":
            "no-cache"
        },

        body: page(
          "",
          "v_inbox_file~v2.7691829274747177012"
        )
      };
    }


    /*
     * POST
     */

    if (event.httpMethod !== "POST") {

      return {
        statusCode: 405,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        },

        body: page(
          "❌ Метод не поддерживается."
        )
      };
    }


    /*
     * Получаем обычную HTML-форму.
     */

    const params =
      new URLSearchParams(
        event.body || ""
      );

    const adminKey =
      params.get("admin_key") || "";

    const publishId =
      params.get("publish_id") || "";


    /*
     * Проверяем ключ.
     */

    if (
      !adminKey ||
      adminKey !==
        process.env.CONTENT_ADMIN_KEY
    ) {

      return {
        statusCode: 401,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        },

        body: page(
          "❌ Неверный ключ администратора.",
          publishId
        )
      };
    }


    /*
     * Проверяем Publish ID.
     */

    if (!publishId) {

      return {
        statusCode: 400,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        },

        body: page(
          "❌ Publish ID не указан.",
          ""
        )
      };
    }


    /*
     * Получаем TikTok token.
     */

    const accessToken =
      await getTikTokToken();


    /*
     * Запрашиваем статус.
     */

    const response =
      await fetch(
        STATUS_URL,
        {
          method: "POST",

          headers: {
            "Authorization":
              "Bearer " + accessToken,

            "Content-Type":
              "application/json; charset=UTF-8"
          },

          body: JSON.stringify({
            publish_id: publishId
          })
        }
      );


    const data =
      await response.json();


    /*
     * Проверяем ответ TikTok.
     */

    if (
      !response.ok ||
      !data.error ||
      data.error.code !== "ok"
    ) {

      const errorText =
        data.error?.message ||
        "TikTok не смог вернуть статус.";

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        },

        body: page(
          "❌ ОШИБКА TIKTOK\n\n" +
          escapeHtml(errorText) +
          "\n\nКод: " +
          escapeHtml(
            data.error?.code || "unknown"
          ),
          publishId
        )
      };
    }


    const status =
      data.data?.status || "UNKNOWN";

    const failReason =
      data.data?.fail_reason || "";


    let resultText = "";


    if (
      status === "PROCESSING_UPLOAD"
    ) {

      resultText =
        "⏳ ВИДЕО ОБРАБАТЫВАЕТСЯ\n\n" +
        "TikTok получил видео и сейчас его обрабатывает.";

    }

    else if (
      status === "SEND_TO_USER_INBOX"
    ) {

      resultText =
        "📥 ВИДЕО ОТПРАВЛЕНО В TIKTOK INBOX\n\n" +
        "Видео успешно передано TikTok.\n\n" +
        "Открой TikTok и проверь Inbox/уведомления. " +
        "Видео необходимо открыть и завершить публикацию через приложение TikTok.";

    }

    else if (
      status === "PUBLISH_COMPLETE"
    ) {

      resultText =
        "✅ ПУБЛИКАЦИЯ ЗАВЕРШЕНА\n\n" +
        "TikTok сообщает, что публикация завершена.";

    }

    else if (
      status === "FAILED"
    ) {

      resultText =
        "❌ ЗАГРУЗКА НЕ ЗАВЕРШЕНА\n\n" +
        "Причина:\n" +
        (failReason || "TikTok не указал причину.");

    }

    else {

      resultText =
        "ℹ️ ТЕКУЩИЙ СТАТУС\n\n" +
        status;
    }


    /*
     * Дополнительная информация.
     */

    resultText +=
      "\n\n" +
      "Publish ID:\n" +
      escapeHtml(publishId) +
      "\n\n" +
      "Статус TikTok:\n" +
      escapeHtml(status);


    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",

        "Cache-Control":
          "no-cache"
      },

      body: page(
        resultText,
        publishId
      )
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
          "text/html; charset=UTF-8"
      },

      body: page(
        "❌ ОШИБКА СЕРВЕРА\n\n" +
        escapeHtml(
          error.message ||
          "Unknown error"
        )
      )
    };
  }
};
