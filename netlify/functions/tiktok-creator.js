const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const keys = await store.list();

    if (!keys.blobs || keys.blobs.length === 0) {
      return html(
        "TikTok не подключён",
        "Сначала подключите TikTok аккаунт."
      );
    }

    const tokenData = await store.get(
      keys.blobs[0].key,
      { type: "json" }
    );

    if (!tokenData?.access_token) {
      return html(
        "Access token не найден",
        "Необходимо повторно авторизовать TikTok."
      );
    }

    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,
          "Content-Type":
            "application/json; charset=UTF-8"
        },
        body: JSON.stringify({})
      }
    );

    const data = await response.json();

    if (!response.ok || data.error?.code !== "ok") {
      return html(
        "TikTok API ошибка",
        data.error?.message ||
          data.error?.code ||
          "Не удалось получить данные автора."
      );
    }

    const creator = data.data || {};

    const privacy =
      creator.privacy_level_options || [];

    const maxDuration =
      creator.max_video_post_duration_sec || 0;

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
Khalim Football — TikTok Creator
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 20px;

  background:
    radial-gradient(
      circle at top,
      #202020,
      #080808
    );

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

  border: 1px solid #303030;

  border-radius: 22px;

  padding: 24px;

  margin-bottom: 18px;
}

h1 {
  margin: 0 0 8px;

  font-size: 30px;
}

h2 {
  margin:
    0 0 20px;

  font-size: 22px;
}

.row {
  background: #292929;

  border-radius: 14px;

  padding: 16px;

  margin-top: 12px;
}

.label {
  color: #999;

  font-size: 13px;

  text-transform: uppercase;

  letter-spacing: 1px;
}

.value {
  margin-top: 6px;

  font-size: 20px;

  font-weight: 700;
}

.success {
  color: #45e878;
}

.warning {
  color: #ffd43b;
}

.scope {
  display: inline-block;

  background: #143c22;

  color: #66ed91;

  border-radius: 20px;

  padding: 8px 12px;

  margin:
    5px 5px 0 0;

  font-size: 14px;
}

.note {
  color: #aaa;

  line-height: 1.5;

  margin-top: 18px;
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
      TikTok Creator Info
    </h2>

    <div class="row">

      <div class="label">
        Аккаунт
      </div>

      <div class="value">
        @${escapeHtml(
          creator.creator_username || "unknown"
        )}
      </div>

    </div>

    <div class="row">

      <div class="label">
        Ник
      </div>

      <div class="value">
        ${escapeHtml(
          creator.creator_nickname || "—"
        )}
      </div>

    </div>

    <div class="row">

      <div class="label">
        Максимальная длительность видео
      </div>

      <div class="value">
        ${maxDuration} сек.
      </div>

    </div>

  </div>

  <div class="card">

    <h2>
      🔐 Доступные настройки
    </h2>

    <div class="label">
      Уровни приватности
    </div>

    <div style="margin-top:10px;">

      ${
        privacy.length
          ? privacy
              .map(
                (item) =>
                  `<span class="scope">
                    ${escapeHtml(item)}
                  </span>`
              )
              .join("")
          : "Нет данных"
      }

    </div>

    <p class="note">
      Данные получены напрямую от TikTok
      через официальный Content Posting API.
    </p>

  </div>

  <div class="card">

    <div class="label">
      Статус
    </div>

    <div class="value success">
      ✓ Creator Info получен
    </div>

    <p class="note">
      Следующий этап — подготовить безопасную
      публикацию видео через Direct Post.
    </p>

  </div>

</div>

</body>

</html>
`
    };

  } catch (error) {
    console.error(error);

    return html(
      "Ошибка сервера",
      error.message || "Unknown error"
    );
  }
};

function html(title, message) {
  return {
    statusCode: 500,

    headers: {
      "Content-Type":
        "text/html; charset=UTF-8"
    },

    body: `
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        >
        <title>${escapeHtml(title)}</title>
      </head>

      <body style="
        background:#101010;
        color:white;
        font-family:Arial;
        padding:30px;
      ">

        <h1>
          ⚠️ ${escapeHtml(title)}
        </h1>

        <p>
          ${escapeHtml(message)}
        </p>

      </body>
      </html>
    `
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
