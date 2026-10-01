const { getStore } = require("@netlify/blobs");

const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Khalim Football — TikTok Upload</title>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  max-width: 620px;
  margin: 30px auto;
  padding: 20px;
  background: #f5f5f7;
}

.card {
  background: white;
  padding: 22px;
  border-radius: 18px;
  box-shadow: 0 4px 20px rgba(0,0,0,.08);
}

h1 {
  margin-top: 0;
}

input,
button {
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  margin-top: 12px;
  border-radius: 10px;
  border: 1px solid #ccc;
  font-size: 16px;
}

button {
  background: #111;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: .5;
}

#result {
  margin-top: 20px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
</head>

<body>

<div class="card">

<h1>🎬 Khalim Football</h1>

<h2>Реальная загрузка видео в TikTok</h2>

<p>
Выберите видео MP4/MOV/WebM.
Максимальный размер этого тестового маршрута — около 4,5 МБ.
</p>

<input
  id="video"
  type="file"
  accept="video/mp4,video/quicktime,video/webm"
>

<input
  id="adminKey"
  type="password"
  placeholder="Введите CONTENT_ADMIN_KEY"
>

<button id="uploadButton">
🚀 Загрузить в TikTok
</button>

<div id="result"></div>

</div>

<script>

const button = document.getElementById("uploadButton");
const result = document.getElementById("result");

button.addEventListener("click", async () => {

  const fileInput = document.getElementById("video");
  const keyInput = document.getElementById("adminKey");

  const file = fileInput.files[0];
  const adminKey = keyInput.value;

  if (!file) {
    result.textContent = "❌ Сначала выберите видео.";
    return;
  }

  if (!adminKey) {
    result.textContent = "❌ Введите CONTENT_ADMIN_KEY.";
    return;
  }

  if (file.size > 4.5 * 1024 * 1024) {
    result.textContent =
      "❌ Файл слишком большой для этого теста. " +
      "Максимум около 4,5 МБ.";
    return;
  }

  button.disabled = true;
  result.textContent =
    "⏳ Подготавливаю видео и подключаюсь к TikTok...";

  try {

    const response = await fetch(window.location.href, {
      method: "POST",

      headers: {
        "Content-Type": file.type || "video/mp4",
        "X-Content-Key": adminKey,
        "X-Video-Name": file.name
      },

      body: file
    });

    const text = await response.text();

    result.innerHTML = text;

  } catch (error) {

    result.textContent =
      "❌ Ошибка соединения:\n" +
      error.message;

  } finally {

    button.disabled = false;

  }

});

</script>

</body>
</html>
`;

exports.handler = async (event) => {

  /*
   * Открытие страницы
   */

  if (event.httpMethod === "GET") {

    return {
      statusCode: 200,

      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },

      body: html
    };
  }

  /*
   * Только POST для загрузки видео
   */

  if (event.httpMethod !== "POST") {

    return {
      statusCode: 405,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8"
      },
      body: "Method not allowed. Use GET or POST."
    };
  }

  /*
   * Проверяем администратора
   */

  const adminKey = process.env.CONTENT_ADMIN_KEY;

  const providedKey =
    event.headers["x-content-key"] ||
    event.headers["X-Content-Key"];

  if (!adminKey) {

    return {
      statusCode: 500,
      body: "CONTENT_ADMIN_KEY is not configured"
    };
  }

  if (providedKey !== adminKey) {

    return {
      statusCode: 401,
      body: "Unauthorized"
    };
  }

  /*
   * Проверяем тело запроса
   */

  if (!event.body) {

    return {
      statusCode: 400,
      body: "Video body is empty."
    };
  }

  /*
   * Netlify передает binary body в Base64.
   */

  const video = Buffer.from(
    event.body,
    event.isBase64Encoded ? "base64" : "utf8"
  );

  const videoSize = video.length;

  /*
   * Безопасный лимит для текущего теста.
   */

  const MAX_SIZE = 4.5 * 1024 * 1024;

  if (videoSize > MAX_SIZE) {

    return {
      statusCode: 413,

      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },

      body: `
        <h2>❌ Видео слишком большое</h2>
        <p>
          Размер файла:
          ${(videoSize / 1024 / 1024).toFixed(2)} MB
        </p>
        <p>
          Для этого тестового маршрута максимум около 4,5 MB.
        </p>
      `
    };
  }

  /*
   * Тип видео
   */

  const contentType =
    event.headers["content-type"] ||
    event.headers["Content-Type"] ||
    "video/mp4";

  const allowedTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm"
  ];

  if (!allowedTypes.includes(contentType)) {

    return {
      statusCode: 400,

      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },

      body: `
        <h2>❌ Неподдерживаемый формат</h2>
        <p>Используйте MP4, MOV или WebM.</p>
      `
    };
  }

  try {

    /*
     * Получаем TikTok token
     */

    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const list = await store.list();

    let tokenData = null;

    if (list && Array.isArray(list.blobs)) {

      const tokenBlob = list.blobs.find(
        blob => blob.key.startsWith("user-")
      );

      if (tokenBlob) {

        tokenData = await store.get(
          tokenBlob.key,
          {
            type: "json"
          }
        );
      }
    }

    if (!tokenData || !tokenData.access_token) {

      return {
        statusCode: 401,

        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },

        body: `
          <h2>❌ TikTok не подключён</h2>
          <p>Access token не найден.</p>
          <p>Сначала выполните авторизацию TikTok.</p>
        `
      };
    }

    /*
     * 1. Инициализация загрузки
     */

    const initResponse = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      {
        method: "POST",

        headers: {
          "Authorization":
            "Bearer " + tokenData.access_token,

          "Content-Type":
            "application/json; charset=UTF-8"
        },

        body: JSON.stringify({

          source_info: {

            source: "FILE_UPLOAD",

            video_size: videoSize,

            chunk_size: videoSize,

            total_chunk_count: 1

          }

        })
      }
    );

    const initData = await initResponse.json();

    if (
      !initResponse.ok ||
      !initData.data ||
      !initData.data.upload_url
    ) {

      return {
        statusCode: 400,

        headers: {
          "Content-Type":
            "application/json; charset=UTF-8"
        },

        body: JSON.stringify({
          step: "TikTok initialization",
          response: initData
        }, null, 2)
      };
    }

    const publishId =
      initData.data.publish_id;

    const uploadUrl =
      initData.data.upload_url;

    /*
     * 2. Отправляем настоящее видео
     */

    const uploadResponse = await fetch(
      uploadUrl,
      {
        method: "PUT",

        headers: {

          "Content-Type": contentType,

          "Content-Length":
            String(videoSize),

          "Content-Range":
            `bytes 0-${videoSize - 1}/${videoSize}`

        },

        body: video
      }
    );

    const uploadResponseText =
      await uploadResponse.text();

    if (!uploadResponse.ok) {

      return {
        statusCode: 400,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        },

        body: `
          <h2>❌ Ошибка загрузки TikTok</h2>

          <p>
            HTTP:
            ${uploadResponse.status}
          </p>

          <p>
            publish_id:
            ${publishId}
          </p>

          <pre>
${escapeHtml(uploadResponseText)}
          </pre>
        `
      };
    }

    /*
     * 3. Проверяем статус
     */

    let statusData = null;

    try {

      const statusResponse =
        await fetch(
          "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
          {
            method: "POST",

            headers: {

              "Authorization":
                "Bearer " + tokenData.access_token,

              "Content-Type":
                "application/json; charset=UTF-8"

            },

            body: JSON.stringify({
              publish_id: publishId
            })
          }
        );

      statusData =
        await statusResponse.json();

    } catch (statusError) {

      statusData = {
        error:
          statusError.message
      };
    }

    /*
     * Успешный результат
     */

    const fileName =
      event.headers["x-video-name"] ||
      event.headers["X-Video-Name"] ||
      "video";

    return {

      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body: `

        <div style="
          font-family:-apple-system,BlinkMacSystemFont,Arial;
          padding:20px;
        ">

        <h2>✅ Видео успешно передано TikTok</h2>

        <p>
          <b>Файл:</b>
          ${escapeHtml(fileName)}
        </p>

        <p>
          <b>Размер:</b>
          ${(videoSize / 1024 / 1024).toFixed(2)} MB
        </p>

        <p>
          <b>publish_id:</b><br>
          ${escapeHtml(publishId)}
        </p>

        <p>
          <b>TikTok Upload:</b>
          HTTP ${uploadResponse.status}
        </p>

        <hr>

        <h3>Статус TikTok</h3>

        <pre style="
          white-space:pre-wrap;
          word-break:break-word;
          background:#f5f5f5;
          padding:15px;
          border-radius:10px;
        ">${escapeHtml(
          JSON.stringify(statusData, null, 2)
        )}</pre>

        <p>
          Видео передано в TikTok через
          <b>video.upload</b>.
        </p>

        <p>
          Для этого режима TikTok использует
          Inbox/Draft flow: окончательное оформление
          публикации выполняется в TikTok.
        </p>

        </div>

      `
    };

  } catch (error) {

    console.error(error);

    return {

      statusCode: 500,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body: `
        <h2>❌ Ошибка сервера</h2>

        <p>
          ${escapeHtml(
            error.message || "Unknown error"
          )}
        </p>
      `
    };
  }
};


/*
 * Безопасный вывод текста в HTML
 */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
