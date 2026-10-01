const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    // =========================
    // GET — панель тестирования
    // =========================

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Cache-Control": "no-store"
        },
        body: `
<!DOCTYPE html>
<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>

<title>
Khalim Football — TikTok Upload Test
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 18px;

  background:
    radial-gradient(
      circle at top,
      #202020,
      #080808
    );

  color: #fff;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Arial,
    sans-serif;
}

.container {
  max-width: 700px;
  margin: auto;
}

.card {
  background: #1c1c1c;

  border: 1px solid #303030;

  border-radius: 22px;

  padding: 22px;

  margin-bottom: 18px;
}

h1 {
  margin: 0 0 8px;

  font-size: 28px;
}

h2 {
  margin:
    0 0 16px;

  font-size: 21px;
}

p {
  color: #aaa;

  line-height: 1.5;
}

input {
  width: 100%;

  padding: 15px;

  margin-top: 10px;

  border-radius: 12px;

  border: 1px solid #444;

  background: #111;

  color: white;

  font-size: 16px;
}

button {
  width: 100%;

  margin-top: 16px;

  padding: 16px;

  border: none;

  border-radius: 14px;

  background: #16803a;

  color: white;

  font-size: 17px;

  font-weight: 800;
}

button:disabled {
  opacity: .5;
}

.result {
  display: none;

  margin-top: 18px;

  padding: 16px;

  border-radius: 14px;

  background: #292929;

  white-space: pre-wrap;

  word-break: break-word;
}

.success {
  border: 1px solid #267a40;
}

.error {
  border: 1px solid #8b3030;
}

.warning {
  margin-top: 18px;

  padding: 14px;

  border-radius: 14px;

  background: #302900;

  color: #ffd84d;
}

</style>

</head>

<body>

<div class="container">

  <div class="card">

    <h1>
      ⚽ Khalim Football
    </h1>

    <h2>
      TikTok Upload Test
    </h2>

    <p>
      Проверяем соединение с TikTok
      и возможность инициализировать
      загрузку видео.
    </p>

    <div class="warning">
      ⚠️ Этот тест НЕ публикует видео.
      Он только проверяет возможность
      начать загрузку.
    </div>

  </div>

  <div class="card">

    <h2>
      🔐 CONTENT_ADMIN_KEY
    </h2>

    <input
      id="adminKey"
      type="password"
      placeholder="Введите CONTENT_ADMIN_KEY"
      autocomplete="off"
    />

    <button
      id="testButton"
      onclick="runTest()"
    >
      🚀 Проверить TikTok Upload API
    </button>

    <div
      id="result"
      class="result"
    ></div>

  </div>

</div>

<script>

async function runTest() {

  const key =
    document.getElementById(
      "adminKey"
    ).value.trim();

  const button =
    document.getElementById(
      "testButton"
    );

  const result =
    document.getElementById(
      "result"
    );

  if (!key) {

    alert(
      "Введите CONTENT_ADMIN_KEY"
    );

    return;
  }

  button.disabled = true;

  button.textContent =
    "⏳ Проверяем...";

  result.style.display =
    "block";

  result.className =
    "result";

  result.textContent =
    "Обращаемся к TikTok...";

  try {

    const response =
      await fetch(
        window.location.pathname,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Content-Key":
              key
          },

          body: JSON.stringify({})
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {

      result.className =
        "result error";

      result.textContent =
        "❌ Ошибка\n\n" +
        (
          data.message ||
          data.error ||
          data.tiktok_error ||
          "Unknown error"
        );

      return;
    }

    result.className =
      "result success";

    result.textContent =
      "✅ TikTok Upload API работает\n\n" +

      "publish_id: " +
      (
        data.publish_id ||
        "не получен"
      ) +

      "\n\nupload_url получен: " +
      (
        data.upload_url_received
          ? "ДА"
          : "НЕТ"
      ) +

      "\n\nScope: " +
      (
        data.scope ||
        "video.upload"
      ) +

      "\n\nВидео НЕ опубликовано.";

  } catch (error) {

    result.className =
      "result error";

    result.textContent =
      "❌ Ошибка соединения\n\n" +
      error.message;

  } finally {

    button.disabled = false;

    button.textContent =
      "🚀 Проверить TikTok Upload API";
  }

}

</script>

</body>

</html>
`
      };
    }

    // =========================
    // POST — тест TikTok
    // =========================

    if (event.httpMethod !== "POST") {
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

    // =========================
    // Проверяем ключ
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
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          success: false,

          error:
            "Unauthorized",

          message:
            "Неверный CONTENT_ADMIN_KEY."
        })
      };
    }

    // =========================
    // Получаем TikTok token
    // =========================

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
            "TikTok account not connected",

          message:
            "TikTok аккаунт не подключён."
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
            "Access token not found",

          message:
            "TikTok access token не найден."
        })
      };
    }

    // =========================
    // Инициализация Upload API
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
    // Ответ TikTok
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

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        success: true,

        message:
          "TikTok Upload API initialization successful.",

        publish_id:
          data.data?.publish_id ||
          null,

        upload_url_received:
          Boolean(
            data.data?.upload_url
          ),

        scope:
          "video.upload",

        video_uploaded:
          false,

        video_published:
          false
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
          "Server error",

        message:
          error.message ||
          "Unknown error"
      })
    };
  }
};
