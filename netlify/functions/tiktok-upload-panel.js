const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tiktok-tokens";

const TIKTOK_INIT_URL =
  "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";

function page(content) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1,
               maximum-scale=1">
<title>Khalim Football — TikTok Upload</title>

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
  padding: 24px;

  background: #ffffff;
  color: #111111;
}

.container {
  max-width: 700px;
  margin: 0 auto;
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

input[type="password"] {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  border: 1px solid #ddd;
  border-radius: 12px;
}

input[type="file"] {
  width: 100%;
  font-size: 17px;
  padding: 12px 0;
}

button {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 20px;
  margin-top: 25px;

  font-size: 20px;
  font-weight: 500;

  background: #eeeeee;
  color: #111111;
}

button:active {
  opacity: 0.7;
}

#status {
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

<h2>TikTok Upload</h2>

<p>
Загрузка видео напрямую из iPhone в TikTok.
</p>

<label>
Ключ администратора
</label>

<input
  id="adminKey"
  type="password"
  placeholder="CONTENT_ADMIN_KEY"
>

<label>
Видео
</label>

<input
  id="video"
  type="file"
  accept="video/mp4,video/quicktime,video/webm,video/*"
>

<button
  id="uploadButton"
  type="button"
  onclick="startUpload()"
>
🚀 Загрузить в TikTok
</button>

<div id="status">
Ожидание...
</div>

</div>


<script>

async function startUpload() {

  const status =
    document.getElementById("status");

  const button =
    document.getElementById("uploadButton");

  const adminKey =
    document.getElementById("adminKey").value.trim();

  const fileInput =
    document.getElementById("video");

  const file =
    fileInput.files[0];


  /*
   * Проверка ключа
   */

  if (!adminKey) {

    status.textContent =
      "❌ Введите ключ администратора.";

    return;
  }


  /*
   * Проверка файла
   */

  if (!file) {

    status.textContent =
      "❌ Сначала выберите видео.";

    return;
  }


  /*
   * TikTok поддерживает MP4 / MOV / WebM.
   */

  const allowedTypes = [
    "video/mp4",
    "video/quicktime",
    "video/webm"
  ];

  if (
    file.type &&
    !allowedTypes.includes(file.type)
  ) {

    status.textContent =
      "❌ Неподдерживаемый формат видео:\\n" +
      file.type;

    return;
  }


  /*
   * Размер файла
   */

  const sizeMB =
    file.size / 1024 / 1024;


  status.textContent =
    "⏳ Видео выбрано.\\n\\n" +

    "Файл: " +
    file.name +
    "\\n" +

    "Тип: " +
    (file.type || "не определён") +
    "\\n" +

    "Размер: " +
    sizeMB.toFixed(2) +
    " MB\\n\\n" +

    "Получаем upload_url от TikTok...";


  button.disabled = true;


  try {

    /*
     * ==================================================
     * ШАГ 1
     *
     * Netlify → TikTok
     *
     * Отправляем только информацию о размере файла.
     * Само видео через Netlify НЕ проходит.
     * ==================================================
     */

    const initResponse =
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
            action: "init",

            video_size:
              file.size,

            content_type:
              file.type || "video/mp4"
          })
        }
      );


    const initText =
      await initResponse.text();


    let initData;

    try {

      initData =
        JSON.parse(initText);

    } catch (e) {

      throw new Error(
        "Netlify вернул некорректный ответ:\\n" +
        initText
      );
    }


    if (
      !initResponse.ok ||
      !initData.success ||
      !initData.upload_url
    ) {

      throw new Error(
        initData.error ||
        "TikTok не вернул upload_url."
      );
    }


    const publishId =
      initData.publish_id;

    const uploadUrl =
      initData.upload_url;


    /*
     * ==================================================
     * ШАГ 2
     *
     * iPhone → TikTok
     *
     * Сам файл отправляется напрямую в TikTok.
     * ==================================================
     */

    status.textContent =
      "✅ TikTok подготовил загрузку.\\n\\n" +

      "Publish ID:\\n" +
      publishId +
      "\\n\\n" +

      "⏳ Отправляем видео напрямую в TikTok...\\n\\n" +

      "Размер: " +
      sizeMB.toFixed(2) +
      " MB";


    /*
     * Для нашего небольшого видео используется
     * один chunk.
     */

    const firstByte = 0;

    const lastByte =
      file.size - 1;

    const totalSize =
      file.size;


    /*
     * Content-Type.
     *
     * Для MOV Safari обычно сообщает
     * video/quicktime.
     */

    let contentType =
      file.type;

    if (!contentType) {

      contentType =
        "video/mp4";
    }


    /*
     * Отправка файла.
     */

    const uploadResponse =
      await fetch(
        uploadUrl,
        {
          method: "PUT",

          headers: {

            "Content-Type":
              contentType,

            "Content-Length":
              String(file.size),

            "Content-Range":
              "bytes " +
              firstByte +
              "-" +
              lastByte +
              "/" +
              totalSize
          },

          body: file
        }
      );


    const uploadText =
      await uploadResponse.text();


    /*
     * TikTok:
     *
     * 201 = весь файл загружен
     * 206 = загружена часть
     */

    if (
      uploadResponse.status !== 201 &&
      uploadResponse.status !== 206
    ) {

      throw new Error(
        "TikTok вернул HTTP " +
        uploadResponse.status +
        "\\n\\n" +
        uploadText
      );
    }


    /*
     * Успешная загрузка.
     */

    status.textContent =
      "✅ ВИДЕО ЗАГРУЖЕНО В TIKTOK\\n\\n" +

      "Publish ID:\\n" +
      publishId +
      "\\n\\n" +

      "Файл:\\n" +
      file.name +
      "\\n\\n" +

      "Размер:\\n" +
      sizeMB.toFixed(2) +
      " MB\\n\\n" +

      "HTTP статус TikTok: " +
      uploadResponse.status +
      "\\n\\n" +

      "Видео передано напрямую с iPhone в TikTok.\\n\\n" +

      "Следующий этап — проверить статус публикации.";

  } catch (error) {

    console.error(error);

    status.textContent =
      "❌ ОШИБКА\\n\\n" +

      (error.message ||
       String(error));

  } finally {

    button.disabled = false;
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


  /*
   * Берём первый сохранённый TikTok token.
   */

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
       * ================================================
       * GET
       * Показываем страницу загрузки.
       * ================================================
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

          body:
            page("")
        };
      }


      /*
       * ================================================
       * POST
       * Получаем только данные для инициализации.
       * Видео сюда НЕ отправляется.
       * ================================================
       */

      if (
        event.httpMethod === "POST"
      ) {


        /*
         * Проверяем администратора.
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

            body:
              JSON.stringify({
                success: false,

                error:
                  "Unauthorized"
              })
          };
        }


        /*
         * Читаем JSON.
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

            body:
              JSON.stringify({

                success: false,

                error:
                  "Invalid JSON"
              })
          };
        }


        /*
         * Проверяем действие.
         */

        if (
          body.action !== "init"
        ) {

          return {

            statusCode: 400,

            headers: {

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                success: false,

                error:
                  "Invalid action"
              })
          };
        }


        /*
         * Размер видео.
         */

        const videoSize =
          Number(
            body.video_size
          );


        if (
          !Number.isFinite(videoSize) ||
          videoSize <= 0
        ) {

          return {

            statusCode: 400,

            headers: {

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                success: false,

                error:
                  "Invalid video size"
              })
          };
        }


        /*
         * Получаем TikTok token.
         */

        const accessToken =
          await getTikTokToken();


        /*
         * ==================================================
         * ВАЖНО
         *
         * Для файла меньше 64 MB используем один chunk.
         *
         * Для файла меньше 5 MB TikTok прямо требует
         * загрузку целиком одним chunk.
         *
         * Для файла до 64 MB один chunk также допустим.
         * ==================================================
         */

        let chunkSize;
        let totalChunkCount;


        if (
          videoSize <=
          64 * 1024 * 1024
        ) {

          chunkSize =
            videoSize;

          totalChunkCount =
            1;

        } else {

          /*
           * Большие файлы:
           * 64 MB chunks.
           */

          chunkSize =
            64 * 1024 * 1024;

          totalChunkCount =
            Math.ceil(
              videoSize /
              chunkSize
            );
        }


        /*
         * Инициализация TikTok.
         */

        const response =
          await fetch(
            TIKTOK_INIT_URL,
            {
              method: "POST",

              headers: {

                "Authorization":
                  "Bearer " +
                  accessToken,

                "Content-Type":
                  "application/json; charset=UTF-8"
              },

              body:
                JSON.stringify({

                  source_info: {

                    source:
                      "FILE_UPLOAD",

                    video_size:
                      videoSize,

                    chunk_size:
                      chunkSize,

                    total_chunk_count:
                      totalChunkCount
                  }
                })
            }
          );


        const data =
          await response.json();


        /*
         * TikTok может вернуть HTTP 200,
         * поэтому проверяем и HTTP,
         * и error.code.
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

            body:
              JSON.stringify({

                success: false,

                error:
                  data.error?.message ||
                  "TikTok upload initialization failed",

                error_code:
                  data.error?.code ||
                  "unknown",

                log_id:
                  data.error?.log_id ||
                  null,

                details:
                  data
              })
          };
        }


        /*
         * Успешная инициализация.
         */

        return {

          statusCode: 200,

          headers: {

            "Content-Type":
              "application/json",

            "Cache-Control":
              "no-cache"
          },

          body:
            JSON.stringify({

              success: true,

              publish_id:
                data.data.publish_id,

              upload_url:
                data.data.upload_url,

              video_size:
                videoSize,

              chunk_size:
                chunkSize,

              total_chunk_count:
                totalChunkCount
            })
        };

      }


      /*
       * Другие HTTP методы запрещены.
       */

      return {

        statusCode: 405,

        headers: {

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            success: false,

            error:
              "Method not allowed"
          })
      };


    } catch (error) {

      console.error(
        "TikTok upload panel error:",
        error
      );


      return {

        statusCode: 500,

        headers: {

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            success: false,

            error:
              error.message ||
              "Server error"
          })
      };
    }
  };
