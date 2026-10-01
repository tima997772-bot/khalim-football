const { getStore } = require("@netlify/blobs");

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page(result = "") {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>Khalim Football</title>

<style>
body {
  font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;
  background:#f5f5f7;
  padding:20px;
}

.card {
  max-width:600px;
  margin:30px auto;
  background:white;
  padding:25px;
  border-radius:20px;
  box-shadow:0 5px 25px rgba(0,0,0,.08);
}

input,
button {
  width:100%;
  box-sizing:border-box;
  padding:15px;
  margin-top:14px;
  border-radius:12px;
  font-size:17px;
}

input {
  border:1px solid #ccc;
}

button {
  border:0;
  background:#111;
  color:white;
  font-weight:700;
}

button:disabled {
  opacity:.5;
}

.result {
  margin-top:20px;
  padding:15px;
  background:#f1f1f1;
  border-radius:12px;
  white-space:pre-wrap;
  word-break:break-word;
}
</style>
</head>

<body>

<div class="card">

<h1>🎬 Khalim Football</h1>

<h2>Загрузка видео в TikTok</h2>

<p>
Выберите видео MP4, введите ключ и нажмите кнопку.
</p>

<input
  id="video"
  type="file"
  accept="video/mp4,video/quicktime,video/webm"
>

<input
  id="key"
  type="password"
  placeholder="CONTENT_ADMIN_KEY"
>

<button id="upload">
🚀 Загрузить в TikTok
</button>

<div id="result"></div>

</div>

<script>

const button =
  document.getElementById("upload");

const result =
  document.getElementById("result");

button.addEventListener("click", async () => {

  const file =
    document.getElementById("video").files[0];

  const key =
    document.getElementById("key").value;

  if (!file) {
    result.textContent =
      "❌ Выберите видео.";
    return;
  }

  if (!key) {
    result.textContent =
      "❌ Введите CONTENT_ADMIN_KEY.";
    return;
  }

  if (file.size > 4.5 * 1024 * 1024) {
    result.textContent =
      "❌ Файл больше 4,5 МБ.";
    return;
  }

  button.disabled = true;

  result.textContent =
    "⏳ Загружаю видео в Netlify...";

  try {

    const response = await fetch(
      window.location.href,
      {
        method:"POST",

        headers:{
          "Content-Type":
            file.type || "video/mp4",

          "X-Content-Key":
            key,

          "X-Video-Name":
            file.name
        },

        body:file
      }
    );

    const text =
      await response.text();

    result.innerHTML = text;

  } catch (error) {

    result.textContent =
      "❌ Ошибка соединения:\n\n" +
      error.message;

  } finally {

    button.disabled = false;

  }

});

</script>

</body>
</html>
`;
}

exports.handler = async (event) => {

  /*
   * GET
   */

  if (event.httpMethod === "GET") {

    return {
      statusCode:200,

      headers:{
        "Content-Type":
          "text/html; charset=UTF-8",

        "Cache-Control":
          "no-cache"
      },

      body:page()
    };
  }

  /*
   * POST
   */

  if (event.httpMethod !== "POST") {

    return {
      statusCode:405,
      body:"Method Not Allowed"
    };
  }

  try {

    /*
     * Проверяем ключ
     */

    const adminKey =
      process.env.CONTENT_ADMIN_KEY;

    const suppliedKey =
      event.headers["x-content-key"] ||
      event.headers["X-Content-Key"];

    if (!adminKey) {

      return {
        statusCode:500,
        body:page(
          "❌ CONTENT_ADMIN_KEY не настроен."
        )
      };
    }

    if (suppliedKey !== adminKey) {

      return {
        statusCode:401,
        body:page(
          "❌ Неверный CONTENT_ADMIN_KEY."
        )
      };
    }

    /*
     * Проверяем тело
     */

    if (!event.body) {

      return {
        statusCode:400,
        body:page(
          "❌ Видео не получено."
        )
      };
    }

    /*
     * Netlify binary body
     */

    const video =
      Buffer.from(
        event.body,
        event.isBase64Encoded
          ? "base64"
          : "utf8"
      );

    const videoSize =
      video.length;

    /*
     * Лимит теста
     */

    const MAX_SIZE =
      4.5 * 1024 * 1024;

    if (videoSize > MAX_SIZE) {

      return {
        statusCode:413,
        body:page(
          "❌ Видео слишком большое.\n\n" +
          "Размер: " +
          (videoSize / 1024 / 1024)
            .toFixed(2) +
          " МБ\n\n" +
          "Максимум: 4,5 МБ."
        )
      };
    }

    /*
     * Тип видео
     */

    const videoType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "video/mp4";

    /*
     * Получаем TikTok token
     */

    const store =
      getStore(
        "tiktok-tokens",
        {
          siteID:
            process.env.SITE_ID,

          token:
            process.env.NETLIFY_AUTH_TOKEN
        }
      );

    const list =
      await store.list();

    let tokenData = null;

    if (
      list &&
      Array.isArray(list.blobs)
    ) {

      const tokenBlob =
        list.blobs.find(
          item =>
            item.key.startsWith("user-")
        );

      if (tokenBlob) {

        tokenData =
          await store.get(
            tokenBlob.key,
            {
              type:"json"
            }
          );
      }
    }

    if (
      !tokenData ||
      !tokenData.access_token
    ) {

      return {
        statusCode:401,

        body:page(
          "❌ TikTok Access Token не найден."
        )
      };
    }

    /*
     * ==========================
     * STEP 1
     * TikTok upload init
     * ==========================
     */

    const initResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        {
          method:"POST",

          headers:{
            "Authorization":
              "Bearer " +
              tokenData.access_token,

            "Content-Type":
              "application/json; charset=UTF-8"
          },

          body:JSON.stringify({

            source_info:{

              source:
                "FILE_UPLOAD",

              video_size:
                videoSize,

              chunk_size:
                videoSize,

              total_chunk_count:
                1
            }

          })
        }
      );

    const initData =
      await initResponse.json();

    if (
      !initResponse.ok ||
      !initData.data ||
      !initData.data.upload_url
    ) {

      return {
        statusCode:400,

        body:page(
          "❌ TikTok init error\n\n" +
          JSON.stringify(
            initData,
            null,
            2
          )
        )
      };
    }

    const publishId =
      initData.data.publish_id;

    const uploadUrl =
      initData.data.upload_url;

    /*
     * ==========================
     * STEP 2
     * PUT video
     * ==========================
     */

    const uploadResponse =
      await fetch(
        uploadUrl,
        {
          method:"PUT",

          headers:{

            "Content-Type":
              videoType,

            "Content-Length":
              String(videoSize),

            "Content-Range":
              `bytes 0-${videoSize - 1}/${videoSize}`
          },

          body:video
        }
      );

    const uploadText =
      await uploadResponse.text();

    if (!uploadResponse.ok) {

      return {
        statusCode:400,

        body:page(
          "❌ TikTok upload error\n\n" +
          "HTTP: " +
          uploadResponse.status +
          "\n\n" +
          esc(uploadText)
        )
      };
    }

    /*
     * ==========================
     * STEP 3
     * Status
     * ==========================
     */

    let statusData = {};

    try {

      const statusResponse =
        await fetch(
          "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
          {
            method:"POST",

            headers:{
              "Authorization":
                "Bearer " +
                tokenData.access_token,

              "Content-Type":
                "application/json; charset=UTF-8"
            },

            body:JSON.stringify({
              publish_id:
                publishId
            })
          }
        );

      statusData =
        await statusResponse.json();

    } catch (error) {

      statusData = {
        error:error.message
      };
    }

    /*
     * УСПЕХ
     */

    const fileName =
      event.headers["x-video-name"] ||
      event.headers["X-Video-Name"] ||
      "video";

    return {

      statusCode:200,

      headers:{
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body:page(`

        <h2>✅ Видео передано TikTok</h2>

        <p>
        <b>Файл:</b><br>
        ${esc(fileName)}
        </p>

        <p>
        <b>Размер:</b>
        ${(videoSize / 1024 / 1024)
          .toFixed(2)}
        МБ
        </p>

        <p>
        <b>publish_id:</b><br>
        ${esc(publishId)}
        </p>

        <p>
        <b>PUT upload:</b>
        HTTP ${uploadResponse.status}
        </p>

        <hr>

        <h3>Статус TikTok</h3>

        <pre>${esc(
          JSON.stringify(
            statusData,
            null,
            2
          )
        )}</pre>

        <hr>

        <p>
        🎬 Видео передано через
        <b>video.upload</b>.
        </p>

        <p>
        Если TikTok использует Inbox flow,
        дальнейшее оформление публикации
        выполняется в приложении TikTok.
        </p>

      `)
    };

  } catch (error) {

    console.error(
      "TikTok upload error:",
      error
    );

    return {

      statusCode:500,

      body:page(
        "❌ Ошибка функции:\n\n" +
        esc(
          error.message ||
          "Unknown error"
        )
      )
    };
  }
};
