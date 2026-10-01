const { getStore } = require("@netlify/blobs");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function page(message = "") {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Khalim Football — TikTok Upload</title>
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
input,button {
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

<form method="POST" enctype="multipart/form-data">

<input
  type="file"
  name="video"
  accept="video/mp4,video/quicktime,video/webm"
  required
>

<input
  type="password"
  name="admin_key"
  placeholder="CONTENT_ADMIN_KEY"
  required
>

<button type="submit">
🚀 Загрузить в TikTok
</button>

</form>

${message ? `<div class="result">${message}</div>` : ""}

</div>

</body>
</html>
`;
}

function parseMultipart(buffer, boundary) {
  const result = {};
  const delimiter = Buffer.from("--" + boundary);

  let position = 0;

  while (true) {
    const start = buffer.indexOf(delimiter, position);

    if (start === -1) break;

    let partStart = start + delimiter.length;

    if (
      buffer[partStart] === 13 &&
      buffer[partStart + 1] === 10
    ) {
      partStart += 2;
    }

    const next = buffer.indexOf(delimiter, partStart);

    if (next === -1) break;

    const headerEnd = buffer.indexOf(
      Buffer.from("\r\n\r\n"),
      partStart
    );

    if (headerEnd === -1) break;

    const headers = buffer
      .slice(partStart, headerEnd)
      .toString("utf8");

    let dataEnd = next;

    if (
      buffer[dataEnd - 2] === 13 &&
      buffer[dataEnd - 1] === 10
    ) {
      dataEnd -= 2;
    }

    const data = buffer.slice(
      headerEnd + 4,
      dataEnd
    );

    const nameMatch = headers.match(
      /name="([^"]+)"/i
    );

    if (!nameMatch) {
      position = next;
      continue;
    }

    const name = nameMatch[1];

    const filenameMatch = headers.match(
      /filename="([^"]*)"/i
    );

    const typeMatch = headers.match(
      /Content-Type:\s*([^\r\n]+)/i
    );

    result[name] = {
      data,
      filename: filenameMatch
        ? filenameMatch[1]
        : null,
      contentType: typeMatch
        ? typeMatch[1].trim()
        : null
    };

    position = next;
  }

  return result;
}

exports.handler = async (event) => {

  /*
   * GET — показываем страницу
   */

  if (event.httpMethod === "GET") {
    return {
      statusCode:200,
      headers:{
        "Content-Type":"text/html; charset=UTF-8",
        "Cache-Control":"no-cache"
      },
      body:page()
    };
  }

  /*
   * POST — принимаем видео
   */

  if (event.httpMethod !== "POST") {
    return {
      statusCode:405,
      headers:{
        "Content-Type":"text/plain; charset=UTF-8"
      },
      body:"Method Not Allowed"
    };
  }

  try {

    /*
     * Проверяем тело
     */

    if (!event.body) {
      return {
        statusCode:400,
        body:page("❌ Видео не получено.")
      };
    }

    /*
     * Content-Type
     */

    const contentType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "";

    const boundaryMatch =
      contentType.match(
        /boundary=(?:"([^"]+)"|([^;]+))/i
      );

    if (!boundaryMatch) {
      return {
        statusCode:400,
        body:page(
          "❌ Не удалось определить multipart boundary."
        )
      };
    }

    const boundary =
      boundaryMatch[1] ||
      boundaryMatch[2];

    /*
     * Декодируем тело Netlify
     */

    const body = Buffer.from(
      event.body,
      event.isBase64Encoded
        ? "base64"
        : "utf8"
    );

    /*
     * Разбираем форму
     */

    const parts = parseMultipart(
      body,
      boundary
    );

    const adminKey =
      process.env.CONTENT_ADMIN_KEY;

    const suppliedKey =
      parts.admin_key
        ? parts.admin_key.data
            .toString("utf8")
            .trim()
        : "";

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
     * Получаем видео
     */

    const videoPart = parts.video;

    if (!videoPart || !videoPart.data) {
      return {
        statusCode:400,
        body:page(
          "❌ Видео не найдено."
        )
      };
    }

    const video = videoPart.data;

    const videoSize = video.length;

    /*
     * IMG_7927.mp4 ≈ 3,23 MB,
     * поэтому проходит этот тест.
     */

    const MAX_SIZE =
      4.5 * 1024 * 1024;

    if (videoSize > MAX_SIZE) {
      return {
        statusCode:413,
        body:page(
          "❌ Видео слишком большое.\n\n" +
          "Размер: " +
          (videoSize / 1024 / 1024).toFixed(2) +
          " MB\n" +
          "Максимум для теста: 4,5 MB."
        )
      };
    }

    const videoType =
      videoPart.contentType ||
      "video/mp4";

    /*
     * Получаем TikTok token
     */

    const store = getStore(
      "tiktok-tokens",
      {
        siteID:process.env.SITE_ID,
        token:process.env.NETLIFY_AUTH_TOKEN
      }
    );

    const list = await store.list();

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
            { type:"json" }
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
          "❌ TikTok Access Token не найден.\n\n" +
          "Нужно повторно подключить TikTok."
        )
      };
    }

    /*
     * =================================
     * STEP 1 — TikTok init
     * =================================
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
              source:"FILE_UPLOAD",
              video_size:videoSize,
              chunk_size:videoSize,
              total_chunk_count:1
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
          "❌ TikTok не выдал upload_url.\n\n" +
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
     * =================================
     * STEP 2 — PUT видео
     * =================================
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
          "❌ TikTok отклонил загрузку.\n\n" +
          "HTTP: " +
          uploadResponse.status +
          "\n\n" +
          uploadText
        )
      };
    }

    /*
     * =================================
     * STEP 3 — status
     * =================================
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
              publish_id:publishId
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
     * SUCCESS
     */

    return {
      statusCode:200,

      headers:{
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body:page(`
        <h2>✅ Видео передано TikTok</h2>

        <p>
        <b>Файл:</b>
        ${escapeHtml(
          videoPart.filename || "video"
        )}
        </p>

        <p>
        <b>Размер:</b>
        ${(videoSize / 1024 / 1024).toFixed(2)}
        MB
        </p>

        <p>
        <b>publish_id:</b><br>
        ${escapeHtml(publishId)}
        </p>

        <p>
        <b>PUT:</b>
        HTTP ${uploadResponse.status}
        </p>

        <hr>

        <h3>Статус TikTok</h3>

        <pre>${escapeHtml(
          JSON.stringify(
            statusData,
            null,
            2
          )
        )}</pre>

        <p>
        Видео загружено через
        <b>video.upload</b>.
        </p>

        <p>
        Если TikTok использует Inbox flow,
        завершение публикации выполняется
        в приложении TikTok.
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
        error.message
      )
    };
  }
};
