const { getStore } = require("@netlify/blobs");

const PAGE = `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Khalim Football — TikTok Upload</title>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  background: #f5f5f7;
  margin: 0;
  padding: 20px;
}

.card {
  max-width: 600px;
  margin: 20px auto;
  background: white;
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 5px 25px rgba(0,0,0,.08);
}

h1 {
  margin-top: 0;
}

input,
button {
  width: 100%;
  box-sizing: border-box;
  margin-top: 15px;
  padding: 15px;
  border-radius: 12px;
  font-size: 17px;
}

input {
  border: 1px solid #ccc;
  background: white;
}

button {
  border: 0;
  background: #111;
  color: white;
  font-weight: 700;
}

.info {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}
</style>
</head>

<body>

<div class="card">

<h1>🎬 Khalim Football</h1>

<h2>Реальная загрузка в TikTok</h2>

<p>
Выберите видео и нажмите кнопку.
</p>

<form
  method="POST"
  enctype="multipart/form-data"
>

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
🚀 Загрузить видео в TikTok
</button>

</form>

<div class="info">
Поддерживаются MP4, MOV и WebM.<br>
Для текущего теста — до 4,5 МБ.
</div>

</div>

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
      body: PAGE
    };
  }

  /*
   * Только POST
   */

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8"
      },
      body: "Method Not Allowed"
    };
  }

  try {

    /*
     * CONTENT_ADMIN_KEY
     */

    const adminKey = process.env.CONTENT_ADMIN_KEY;

    /*
     * Получаем multipart body
     */

    if (!event.body) {
      return errorPage("Видео не получено.");
    }

    const rawBody = Buffer.from(
      event.body,
      event.isBase64Encoded ? "base64" : "utf8"
    );

    const contentType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "";

    const boundaryMatch =
      contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

    if (!boundaryMatch) {
      return errorPage(
        "Не найден multipart boundary."
      );
    }

    const boundary =
      boundaryMatch[1] || boundaryMatch[2];

    /*
     * Разбираем multipart/form-data
     */

    const parts = parseMultipart(
      rawBody,
      boundary
    );

    const adminKeyFromForm =
      parts.admin_key
        ? parts.admin_key.toString("utf8").trim()
        : "";

    if (!adminKey || adminKeyFromForm !== adminKey) {
      return errorPage(
        "Неверный CONTENT_ADMIN_KEY."
      );
    }

    const videoPart = parts.video;

    if (!videoPart || !videoPart.data) {
      return errorPage(
        "Видео не найдено в форме."
      );
    }

    const video = videoPart.data;

    const videoSize = video.length;

    /*
     * Лимит текущего теста
     */

    const MAX_SIZE =
      4.5 * 1024 * 1024;

    if (videoSize > MAX_SIZE) {
      return errorPage(
        "Видео слишком большое. Размер: " +
        (videoSize / 1024 / 1024).toFixed(2) +
        " МБ. Максимум для этого теста — около 4,5 МБ."
      );
    }

    /*
     * Проверяем MIME
     */

    let videoType =
      videoPart.contentType ||
      "video/mp4";

    const allowedTypes = [
      "video/mp4",
      "video/quicktime",
      "video/webm"
    ];

    if (!allowedTypes.includes(videoType)) {
      return errorPage(
        "Неподдерживаемый формат видео: " +
        videoType
      );
    }

    /*
     * Получаем TikTok token
     */

    const store = getStore(
      "tiktok-tokens",
      {
        siteID:
          process.env.SITE_ID,

        token:
          process.env.NETLIFY_AUTH_TOKEN
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
          blob =>
            blob.key.startsWith("user-")
        );

      if (tokenBlob) {

        tokenData =
          await store.get(
            tokenBlob.key,
            {
              type: "json"
            }
          );
      }
    }

    if (
      !tokenData ||
      !tokenData.access_token
    ) {

      return errorPage(
        "TikTok Access Token не найден. " +
        "Необходимо повторно подключить TikTok."
      );
    }

    /*
     * ==================================
     * ШАГ 1
     * Инициализация TikTok Upload API
     * ==================================
     */

    const initResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        {
          method: "POST",

          headers: {
            "Authorization":
              "Bearer " +
              tokenData.access_token,

            "Content-Type":
              "application/json; charset=UTF-8"
          },

          body: JSON.stringify({

            source_info: {

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

      return errorPage(
        "TikTok не выдал upload_url.<br><br>" +
        escapeHtml(
          JSON.stringify(
            initData,
            null,
            2
          )
        )
      );
    }

    const publishId =
      initData.data.publish_id;

    const uploadUrl =
      initData.data.upload_url;

    /*
     * ==================================
     * ШАГ 2
     * Реальная отправка видео
     * ==================================
     */

    const uploadResponse =
      await fetch(
        uploadUrl,
        {
          method: "PUT",

          headers: {

            "Content-Type":
              videoType,

            "Content-Length":
              String(videoSize),

            "Content-Range":
              "bytes 0-" +
              (videoSize - 1) +
              "/" +
              videoSize
          },

          body: video
        }
      );

    const uploadText =
      await uploadResponse.text();

    if (!uploadResponse.ok) {

      return errorPage(
        "TikTok отклонил загрузку.<br><br>" +

        "HTTP: " +
        uploadResponse.status +

        "<br><br>" +

        escapeHtml(uploadText)
      );
    }

    /*
     * ==================================
     * ШАГ 3
     * Проверяем статус
     * ==================================
     */

    let statusData;

    try {

      const statusResponse =
        await fetch(
          "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
          {
            method: "POST",

            headers: {

              "Authorization":
                "Bearer " +
                tokenData.access_token,

              "Content-Type":
                "application/json; charset=UTF-8"
            },

            body: JSON.stringify({
              publish_id:
                publishId
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
      videoPart.filename ||
      "video";

    return {

      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body: `

<!DOCTYPE html>
<html lang="ru">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>TikTok Upload Result</title>

<style>

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    Arial,
    sans-serif;

  background:#f5f5f7;
  padding:20px;
}

.card {
  max-width:600px;
  margin:auto;
  background:white;
  padding:25px;
  border-radius:20px;
}

.success {
  font-size:24px;
  font-weight:700;
}

pre {
  background:#f1f1f1;
  padding:15px;
  border-radius:10px;
  overflow:auto;
  white-space:pre-wrap;
  word-break:break-word;
}

</style>

</head>

<body>

<div class="card">

<div class="success">
✅ Видео успешно передано TikTok
</div>

<hr>

<p>
<b>Файл:</b><br>
${escapeHtml(fileName)}
</p>

<p>
<b>Размер:</b>
${(videoSize / 1024 / 1024).toFixed(2)} МБ
</p>

<p>
<b>Формат:</b>
${escapeHtml(videoType)}
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

<pre>${escapeHtml(
  JSON.stringify(
    statusData,
    null,
    2
  )
)}</pre>

<hr>

<p>
Видео передано через
<b>video.upload</b>.
</p>

<p>
Для Inbox/Draft режима TikTok может потребовать
завершить оформление публикации непосредственно
в приложении TikTok.
</p>

</div>

</body>

</html>

`
    };

  } catch (error) {

    console.error(error);

    return errorPage(
      "Ошибка сервера:<br><br>" +
      escapeHtml(
        error.message ||
        "Unknown error"
      )
    );
  }
};


/*
 * ==================================
 * Multipart parser
 * ==================================
 */

function parseMultipart(
  buffer,
  boundary
) {

  const result = {};

  const delimiter =
    Buffer.from(
      "--" + boundary
    );

  let position = 0;

  while (true) {

    const start =
      buffer.indexOf(
        delimiter,
        position
      );

    if (start === -1) {
      break;
    }

    const nextStart =
      buffer.indexOf(
        delimiter,
        start + delimiter.length
      );

    if (nextStart === -1) {
      break;
    }

    let partStart =
      start + delimiter.length;

    /*
     * Пропускаем CRLF
     */

    if (
      buffer[partStart] === 13 &&
      buffer[partStart + 1] === 10
    ) {
      partStart += 2;
    }

    const headerEnd =
      buffer.indexOf(
        Buffer.from("\r\n\r\n"),
        partStart
      );

    if (headerEnd === -1) {
      break;
    }

    const headersText =
      buffer
        .slice(
          partStart,
          headerEnd
        )
        .toString("utf8");

    const dataStart =
      headerEnd + 4;

    let dataEnd =
      nextStart;

    /*
     * Убираем CRLF перед boundary
     */

    if (
      buffer[dataEnd - 2] === 13 &&
      buffer[dataEnd - 1] === 10
    ) {
      dataEnd -= 2;
    }

    const data =
      buffer.slice(
        dataStart,
        dataEnd
      );

    const dispositionMatch =
      headersText.match(
        /name="([^"]+)"/i
      );

    if (!dispositionMatch) {
      position =
        nextStart;
      continue;
    }

    const name =
      dispositionMatch[1];

    const filenameMatch =
      headersText.match(
        /filename="([^"]*)"/i
      );

    const typeMatch =
      headersText.match(
        /Content-Type:\s*([^\r\n]+)/i
      );

    result[name] = {

      data,

      filename:
        filenameMatch
          ? filenameMatch[1]
          : null,

      contentType:
        typeMatch
          ? typeMatch[1].trim()
          : null
    };

    position =
      nextStart;
  }

  return result;
}


/*
 * ==================================
 * Error page
 * ==================================
 */

function errorPage(message) {

  return {

    statusCode: 400,

    headers: {
      "Content-Type":
        "text/html; charset=UTF-8"
    },

    body: `

<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>Khalim Football</title>

<style>

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    Arial,
    sans-serif;

  padding:25px;
  background:#f5f5f7;
}

.card {
  max-width:600px;
  margin:auto;
  background:white;
  padding:25px;
  border-radius:20px;
}

</style>

</head>

<body>

<div class="card">

<h2>❌ Ошибка</h2>

<p>
${message}
</p>

</div>

</body>

</html>

`
  };
}


/*
 * ==================================
 * HTML escape
 * ==================================
 */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
