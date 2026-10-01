const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    // =========================
    // GET — показываем панель
    // =========================

    if (event.httpMethod === "GET") {
      return page();
    }

    // =========================
    // POST — запускаем тест
    // =========================

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8"
        },
        body: "Method not allowed"
      };
    }

    // Получаем CONTENT_ADMIN_KEY
    // из обычной HTML-формы
    const body = new URLSearchParams(
      event.body || ""
    );

    const providedKey =
      body.get("admin_key");

    const adminKey =
      process.env.CONTENT_ADMIN_KEY;

    if (
      !adminKey ||
      providedKey !== adminKey
    ) {
      return resultPage(
        false,
        "Неверный CONTENT_ADMIN_KEY."
      );
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
      return resultPage(
        false,
        "TikTok аккаунт не подключён."
      );
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
      return resultPage(
        false,
        "TikTok access token не найден."
      );
    }

    // =========================
    // TikTok Upload API
    // =========================

    const response = await fetch(
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
    // Ошибка TikTok
    // =========================

    if (
      !response.ok ||
      data.error?.code !== "ok"
    ) {
      return resultPage(
        false,
        `TikTok API error

Код:
${data.error?.code || "unknown_error"}

Сообщение:
${data.error?.message || "Неизвестная ошибка"}

Log ID:
${data.error?.log_id || "—"}`
      );
    }

    // =========================
    // УСПЕШНЫЙ ТЕСТ
    // =========================

    const publishId =
      data.data?.publish_id ||
      null;

    const uploadUrl =
      data.data?.upload_url ||
      null;

    return resultPage(
      true,
      `TikTok Upload API работает.

publish_id:
${publishId || "не получен"}

upload_url получен:
${uploadUrl ? "ДА" : "НЕТ"}

Scope:
video.upload

Видео НЕ загружено.
Видео НЕ опубликовано.`
    );

  } catch (error) {

    console.error(error);

    return resultPage(
      false,
      `Ошибка сервера:

${error.message || "Unknown error"}`
    );
  }
};


// ========================================
// Главная страница
// ========================================

function page() {

  return {
    statusCode: 200,

    headers: {
      "Content-Type":
        "text/html; charset=UTF-8",

      "Cache-Control":
        "no-store"
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

  border:
    1px solid #303030;

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

  padding: 16px;

  margin-top: 10px;

  border-radius: 12px;

  border:
    1px solid #444;

  background: #111;

  color: white;

  font-size: 16px;

  outline: none;
}

button {
  width: 100%;

  margin-top: 16px;

  padding: 17px;

  border: none;

  border-radius: 14px;

  background: #16803a;

  color: white;

  font-size: 17px;

  font-weight: 800;
}

.warning {
  margin-top: 18px;

  padding: 15px;

  border-radius: 14px;

  background: #302900;

  color: #ffd84d;

  line-height: 1.5;
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
      Проверяем возможность
      инициализировать загрузку видео
      через официальный TikTok API.
    </p>

    <div class="warning">
      ⚠️ Этот тест не загружает видео
      и не публикует его.
    </div>

  </div>

  <div class="card">

    <h2>
      🔐 Авторизация
    </h2>

    <form
      method="POST"
      action=""
    >

      <input
        type="password"
        name="admin_key"
        placeholder="Введите CONTENT_ADMIN_KEY"
        autocomplete="off"
        required
      />

      <button type="submit">
        🚀 Проверить TikTok Upload API
      </button>

    </form>

  </div>

</div>

</body>

</html>
`
  };
}


// ========================================
// Страница результата
// ========================================

function resultPage(
  success,
  message
) {

  return {
    statusCode:
      success ? 200 : 400,

    headers: {
      "Content-Type":
        "text/html; charset=UTF-8",

      "Cache-Control":
        "no-store"
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
Khalim Football — Result
</title>

<style>

body {
  margin: 0;
  padding: 20px;

  background: #090909;

  color: white;

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

  border-radius: 22px;

  padding: 24px;

  border:
    1px solid
    ${success ? "#267a40" : "#8b3030"};
}

h1 {
  margin-top: 0;

  font-size: 26px;

  color:
    ${success ? "#45e878" : "#ff6565"};
}

pre {
  white-space: pre-wrap;

  word-break: break-word;

  line-height: 1.6;

  font-size: 15px;
}

a {
  display: block;

  margin-top: 22px;

  padding: 15px;

  text-align: center;

  border-radius: 14px;

  background: #292929;

  color: white;

  text-decoration: none;

  font-weight: 700;
}

</style>

</head>

<body>

<div class="container">

  <div class="card">

    <h1>
      ${success
        ? "✅ Тест успешен"
        : "❌ Тест завершился ошибкой"}
    </h1>

    <pre>${escapeHtml(
      message
    )}</pre>

    <a
      href="/.netlify/functions/tiktok-upload-panel"
    >
      ← Вернуться к тесту
    </a>

  </div>

</div>

</body>

</html>
`
  };
}


// ========================================
// Безопасный HTML
// ========================================

function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}
