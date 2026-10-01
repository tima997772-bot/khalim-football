const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tiktok-tokens";

function html(body) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Khalim Football — TikTok Upload</title>
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 24px;
  max-width: 700px;
  margin: auto;
}
button {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  margin-top: 15px;
}
input {
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
  margin-top: 8px;
}
#status {
  margin-top: 20px;
  padding: 15px;
  background: #f2f2f2;
  white-space: pre-wrap;
}
</style>
</head>
<body>

<h1>🎬 Khalim Football</h1>
<h2>TikTok Upload</h2>

${body}

</body>
</html>`;
}

async function getToken() {
  const store = getStore(STORE_NAME, {
    siteID: process.env.SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN
  });

  const list = await store.list();

  if (!list || !list.blobs || !list.blobs.length) {
    throw new Error("TikTok account is not connected.");
  }

  const key = list.blobs[0].key;

  const data = await store.get(key, {
    type: "json"
  });

  if (!data || !data.access_token) {
    throw new Error("TikTok access token not found.");
  }

  return data.access_token;
}

exports.handler = async (event) => {
  try {
    /*
     * GET — upload page
     */
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Cache-Control": "no-cache"
        },
        body: html(`
          <p>Выберите видео на iPhone.</p>

          <label>Ключ администратора</label>
          <input id="adminKey" type="password" placeholder="CONTENT_ADMIN_KEY">

          <label style="display:block;margin-top:15px;">Видео</label>
          <input id="video" type="file" accept="video/*">

          <button onclick="startUpload()">
            🚀 Загрузить в TikTok
          </button>

          <div id="status">Ожидание...</div>

<script>
async function startUpload() {

  const status = document.getElementById("status");
  const fileInput = document.getElementById("video");
  const adminKey = document.getElementById("adminKey").value;
  const file = fileInput.files[0];

  if (!adminKey) {
    status.textContent = "❌ Введите ключ администратора.";
    return;
  }

  if (!file) {
    status.textContent = "❌ Выберите видео.";
    return;
  }

  status.textContent =
    "⏳ Файл выбран:\\n" +
    file.name +
    "\\nРазмер: " +
    (file.size / 1024 / 1024).toFixed(2) +
    " MB\\n\\nПолучаем upload_url от TikTok...";

  try {

    /*
     * 1. Netlify получает upload_url от TikTok.
     * Видео сюда НЕ отправляется.
     */
    const initResponse = await fetch("", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Content-Key": adminKey
      },
      body: JSON.stringify({
        action: "init",
        video_size: file.size,
        content_type: file.type || "video/mp4"
      })
    });

    const initData = await initResponse.json();

    if (!initResponse.ok || !initData.upload_url) {
      throw new Error(
        initData.error ||
        "TikTok не вернул upload_url."
      );
    }

    status.textContent =
      "✅ upload_url получен.\\n\\n" +
      "Теперь отправляем видео напрямую в TikTok...";

    /*
     * 2. iPhone → TikTok напрямую.
     */
    const contentType =
      file.type ||
      "video/mp4";

    const endByte = file.size - 1;

    const uploadResponse = await fetch(
      initData.upload_url,
      {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Range":
            "bytes 0-" +
            endByte +
            "/" +
            file.size
        },
        body: file
      }
    );

    const uploadText = await uploadResponse.text();

    if (!uploadResponse.ok) {
      throw new Error(
        "TikTok upload error " +
        uploadResponse.status +
        ": " +
        uploadText
      );
    }

    status.textContent =
      "✅ ВИДЕО ЗАГРУЖЕНО В TIKTOK\\n\\n" +
      "Publish ID:\\n" +
      initData.publish_id +
      "\\n\\n" +
      "Размер: " +
      (file.size / 1024 / 1024).toFixed(2) +
      " MB\\n\\n" +
      "Видео отправлено напрямую в TikTok.\\n" +
      "Netlify не передавал через себя файл.";

  } catch (error) {

    status.textContent =
      "❌ ОШИБКА\\n\\n" +
      (error.message || error);

    console.error(error);
  }
}
</script>
        `)
      };
    }

    /*
     * POST — только получение upload_url.
     */
    if (event.httpMethod === "POST") {

      const adminKey =
        event.headers["x-content-key"] ||
        event.headers["X-Content-Key"];

      if (!adminKey ||
          adminKey !== process.env.CONTENT_ADMIN_KEY) {
        return {
          statusCode: 401,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            error: "Unauthorized"
          })
        };
      }

      const body =
        JSON.parse(event.body || "{}");

      if (body.action !== "init") {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            error: "Invalid action"
          })
        };
      }

      const videoSize =
        Number(body.video_size);

      if (!videoSize || videoSize <= 0) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            error: "Invalid video size"
          })
        };
      }

      const accessToken =
        await getToken();

      /*
       * Для файлов меньше 5 MB TikTok разрешает
       * загрузку одним целым чанком.
       */
      const chunkSize =
        videoSize < 5 * 1024 * 1024
          ? videoSize
          : 5 * 1024 * 1024;

      const totalChunks =
        Math.ceil(videoSize / chunkSize);

      const response = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        {
          method: "POST",
          headers: {
            "Authorization":
              "Bearer " + accessToken,
            "Content-Type":
              "application/json; charset=UTF-8"
          },
          body: JSON.stringify({
            source_info: {
              source: "FILE_UPLOAD",
              video_size: videoSize,
              chunk_size: chunkSize,
              total_chunk_count: totalChunks
            }
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok ||
          data.error?.code !== "ok") {

        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            error:
              data.error?.message ||
              "TikTok upload initialization failed",
            details: data
          })
        };
      }

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
          publish_id: data.data.publish_id,
          upload_url: data.data.upload_url
        })
      };
    }

    return {
      statusCode: 405,
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        error: "Method not allowed"
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
        error:
          error.message ||
          "Server error"
      })
    };
  }
};
