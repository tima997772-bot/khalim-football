const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tiktok-tokens";

const TIKTOK_VIDEO_LIST =
  "https://open.tiktokapis.com/v2/video/list/";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page(content) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>Khalim Football — Latest TikTok</title>

<style>
body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  margin: 0;
  padding: 25px;
  background: #fff;
  color: #111;
}

.container {
  max-width: 700px;
  margin: auto;
}

h1 {
  font-size: 38px;
}

h2 {
  font-size: 28px;
}

.result {
  margin-top: 25px;
  padding: 22px;
  background: #f3f3f3;
  border-radius: 14px;
  font-size: 18px;
  line-height: 1.6;
  word-break: break-word;
}

button {
  width: 100%;
  padding: 18px;
  margin-top: 20px;
  border: 0;
  border-radius: 14px;
  background: #eee;
  font-size: 19px;
}
</style>
</head>

<body>

<div class="container">

<h1>🎬 Khalim Football</h1>

<h2>Последнее видео TikTok</h2>

<form method="POST">

<button type="submit">
🔄 Найти последнее видео
</button>

</form>

${
  content
    ? `<div class="result">${content}</div>`
    : `<div class="result">Нажмите кнопку для проверки.</div>`
}

</div>

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

        body: page("")
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
     * Получаем TikTok token
     */

    const accessToken =
      await getTikTokToken();


    /*
     * Запрашиваем последние 20 видео.
     *
     * fields находятся в URL,
     * max_count — в JSON body.
     */

    const fields = [
      "id",
      "create_time",
      "video_description",
      "title",
      "duration",
      "height",
      "width",
      "share_url",
      "like_count",
      "comment_count",
      "share_count",
      "view_count"
    ].join(",");


    const response =
      await fetch(
        `${TIKTOK_VIDEO_LIST}?fields=${encodeURIComponent(fields)}`,
        {
          method: "POST",

          headers: {
            "Authorization":
              "Bearer " + accessToken,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            max_count: 20
          })
        }
      );


    const data =
      await response.json();


    /*
     * Проверяем API.
     */

    if (
      !response.ok ||
      !data.error ||
      data.error.code !== "ok"
    ) {

      throw new Error(
        data.error?.message ||
        "TikTok video.list error"
      );
    }


    const videos =
      data.data?.videos || [];


    if (!videos.length) {

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        },

        body: page(
          "⚠️ TikTok не вернул видео."
        )
      };
    }


    /*
     * TikTok возвращает видео
     * от нового к старому.
     */

    const latest =
      videos[0];


    const createTime =
      latest.create_time
        ? new Date(
            latest.create_time * 1000
          ).toLocaleString(
            "ru-RU"
          )
        : "—";


    /*
     * Показываем результат.
     */

    const content = `

      <strong>
        ✅ ПОСЛЕДНЕЕ ВИДЕО НАЙДЕНО
      </strong>

      <br><br>

      <strong>Video ID:</strong><br>
      ${escapeHtml(latest.id)}

      <br><br>

      <strong>Опубликовано:</strong><br>
      ${escapeHtml(createTime)}

      <br><br>

      <strong>Название:</strong><br>
      ${escapeHtml(
        latest.title ||
        "—"
      )}

      <br><br>

      <strong>Описание:</strong><br>
      ${escapeHtml(
        latest.video_description ||
        "—"
      )}

      <br><br>

      <strong>Просмотры:</strong>
      ${latest.view_count ?? 0}

      <br>

      <strong>Лайки:</strong>
      ${latest.like_count ?? 0}

      <br>

      <strong>Комментарии:</strong>
      ${latest.comment_count ?? 0}

      <br>

      <strong>Репосты:</strong>
      ${latest.share_count ?? 0}

      <br><br>

      <strong>Размер:</strong><br>
      ${latest.width || "—"} ×
      ${latest.height || "—"}

      <br><br>

      <strong>Длительность:</strong>
      ${latest.duration ?? "—"} сек.

      <br><br>

      <strong>Share URL:</strong><br>
      ${escapeHtml(
        latest.share_url ||
        "—"
      )}

    `;


    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",

        "Cache-Control":
          "no-cache"
      },

      body: page(content)
    };


  } catch (error) {

    console.error(
      "Latest TikTok error:",
      error
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body: page(
        "❌ ОШИБКА\n\n" +
        escapeHtml(
          error.message ||
          "Server error"
        )
      )
    };
  }
};
