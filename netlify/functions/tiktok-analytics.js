const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    // ==========================================
    // 1. Подключаем хранилище TikTok-токена
    // ==========================================

    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // ==========================================
    // 2. Находим сохранённый TikTok аккаунт
    // ==========================================

    const keys = await store.list();

    if (!keys || !keys.blobs || keys.blobs.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: "<h1>Токен TikTok не найден</h1>"
      };
    }

    const key = keys.blobs[0].key;

    const tokenData = await store.get(key, {
      type: "json"
    });

    if (!tokenData || !tokenData.access_token) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: "<h1>Access token TikTok не найден</h1>"
      };
    }

    const accessToken = tokenData.access_token;

    // ==========================================
    // 3. Запрашиваем последние 20 видео TikTok
    // ==========================================

    const fields = [
      "id",
      "create_time",
      "video_description",
      "title",
      "like_count",
      "comment_count",
      "share_count",
      "view_count",
      "share_url",
      "embed_link"
    ].join(",");

    const url =
      "https://open.tiktokapis.com/v2/video/list/" +
      "?fields=" +
      encodeURIComponent(fields);

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        max_count: 20
      })
    });

    const result = await response.json();

    // ==========================================
    // 4. Проверяем ответ TikTok
    // ==========================================

    if (!response.ok || result.error?.code !== "ok") {
      console.error("TikTok API error:", result);

      return {
        statusCode: 400,

        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },

        body: JSON.stringify(
          {
            error: result.error || {
              code: "http_error",
              message: `HTTP ${response.status}`
            }
          },
          null,
          2
        )
      };
    }

    // ==========================================
    // 5. Получаем видео
    // ==========================================

    const videos = result.data?.videos || [];

    if (videos.length === 0) {
      return {
        statusCode: 200,

        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },

        body: `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Khalim Football — Analytics</title>

<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: #f5f5f5;
  color: #111;
}

h1 {
  margin-bottom: 5px;
}

.subtitle {
  color: #666;
  margin-bottom: 25px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

</style>
</head>

<body>

<h1>Khalim Football</h1>

<div class="subtitle">
Аналитика TikTok — @khalim_football
</div>

<div class="card">
  <h2>Видео не найдены</h2>
  <p>TikTok не вернул опубликованные видео для этого аккаунта.</p>
</div>

</body>
</html>
`
      };
    }

    // ==========================================
    // 6. Общая статистика
    // ==========================================

    const totalViews = videos.reduce(
      (sum, video) =>
        sum + Number(video.view_count || 0),
      0
    );

    const totalLikes = videos.reduce(
      (sum, video) =>
        sum + Number(video.like_count || 0),
      0
    );

    const totalComments = videos.reduce(
      (sum, video) =>
        sum + Number(video.comment_count || 0),
      0
    );

    const totalShares = videos.reduce(
      (sum, video) =>
        sum + Number(video.share_count || 0),
      0
    );

    const averageViews = Math.round(
      totalViews / videos.length
    );

    const averageLikes = Math.round(
      totalLikes / videos.length
    );

    const engagement =
      totalViews > 0
        ? (
            (
              (
                totalLikes +
                totalComments +
                totalShares
              ) /
              totalViews
            ) * 100
          ).toFixed(2)
        : "0.00";

    // ==========================================
    // 7. Сортируем видео по просмотрам
    // ==========================================

    const sortedVideos = [...videos].sort(
      (a, b) =>
        Number(b.view_count || 0) -
        Number(a.view_count || 0)
    );

    const bestVideos = sortedVideos.slice(0, 5);

    // ==========================================
    // 8. Защита HTML
    // ==========================================

    const escapeHtml = (value) => {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // ==========================================
    // 9. Формируем список лучших видео
    // ==========================================

    const bestRows = bestVideos
      .map((video, index) => {

        const title =
          video.title ||
          video.video_description ||
          "Без названия";

        const shortTitle =
          title.length > 100
            ? title.substring(0, 100) + "..."
            : title;

        const safeTitle = escapeHtml(shortTitle);

        const views = Number(
          video.view_count || 0
        );

        const likes = Number(
          video.like_count || 0
        );

        const comments = Number(
          video.comment_count || 0
        );

        const shares = Number(
          video.share_count || 0
        );

        const videoUrl =
          video.share_url ||
          video.embed_link ||
          "#";

        return `
<tr>
  <td>${index + 1}</td>

  <td>
    <a
      href="${escapeHtml(videoUrl)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${safeTitle}
    </a>
  </td>

  <td>${views.toLocaleString("ru-RU")}</td>

  <td>${likes.toLocaleString("ru-RU")}</td>

  <td>${comments.toLocaleString("ru-RU")}</td>

  <td>${shares.toLocaleString("ru-RU")}</td>
</tr>
`;
      })
      .join("");

    // ==========================================
    // 10. Рекомендации
    // ==========================================

    let recommendation = "";

    if (averageViews < 300) {
      recommendation +=
        "<li>Усилить первые 1–2 секунды ролика: результат, интрига или действие сразу.</li>";
    }

    if (Number(engagement) < 3) {
      recommendation +=
        "<li>Добавлять более сильный призыв к реакции: вопрос, спорное утверждение или мини-челлендж.</li>";
    }

    if (totalShares > totalLikes * 0.3) {
      recommendation +=
        "<li>Контент хорошо подходит для распространения — стоит тестировать похожие форматы.</li>";
    }

    if (!recommendation) {
      recommendation =
        "<li>Продолжать тестирование форматов и сравнивать новые публикации с текущими результатами.</li>";
    }

    // ==========================================
    // 11. HTML аналитики
    // ==========================================

    return {
      statusCode: 200,

      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },

      body: `
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>Khalim Football — Analytics</title>

<style>

body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: #f5f5f5;
  color: #111;
}

h1 {
  margin-bottom: 5px;
}

.subtitle {
  color: #666;
  margin-bottom: 25px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 25px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}

.number {
  font-size: 28px;
  font-weight: bold;
  margin-top: 5px;
}

.label {
  color: #666;
  font-size: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  margin-top: 15px;
}

th,
td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: left;
  vertical-align: top;
}

th {
  background: #222;
  color: white;
}

a {
  color: #0066cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.recommendations {
  background: white;
  border-radius: 12px;
  padding: 18px;
  margin-top: 25px;
}

.recommendations li {
  margin-bottom: 10px;
}

@media (max-width: 700px) {

  body {
    padding: 12px;
  }

  .stats {
    grid-template-columns: 1fr 1fr;
  }

  table {
    font-size: 12px;
  }

  th,
  td {
    padding: 7px;
  }

}

</style>

</head>

<body>

<h1>Khalim Football</h1>

<div class="subtitle">
  Аналитика TikTok — @khalim_football
</div>

<div class="stats">

  <div class="card">
    <div class="label">
      Проанализировано видео
    </div>

    <div class="number">
      ${videos.length}
    </div>
  </div>


  <div class="card">
    <div class="label">
      Всего просмотров
    </div>

    <div class="number">
      ${totalViews.toLocaleString("ru-RU")}
    </div>
  </div>


  <div class="card">
    <div class="label">
      Средние просмотры
    </div>

    <div class="number">
      ${averageViews.toLocaleString("ru-RU")}
    </div>
  </div>


  <div class="card">
    <div class="label">
      Средние лайки
    </div>

    <div class="number">
      ${averageLikes.toLocaleString("ru-RU")}
    </div>
  </div>


  <div class="card">
    <div class="label">
      Всего комментариев
    </div>

    <div class="number">
      ${totalComments.toLocaleString("ru-RU")}
    </div>
  </div>


  <div class="card">
    <div class="label">
      Всего репостов
    </div>

    <div class="number">
      ${totalShares.toLocaleString("ru-RU")}
    </div>
  </div>


  <div class="card">
    <div class="label">
      Вовлечённость
    </div>

    <div class="number">
      ${engagement}%
    </div>
  </div>

</div>


<h2>
  Топ-5 видео по просмотрам
</h2>


<table>

<thead>

<tr>

<th>#</th>

<th>Видео</th>

<th>Просмотры</th>

<th>Лайки</th>

<th>Комментарии</th>

<th>Репосты</th>

</tr>

</thead>


<tbody>

${bestRows}

</tbody>

</table>


<div class="recommendations">

<h2>
  Рекомендации агента
</h2>

<ul>

${recommendation}

</ul>

</div>


</body>

</html>
`
    };

  } catch (error) {

    console.error(
      "TikTok analytics error:",
      error
    );

    return {

      statusCode: 500,

      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },

      body: `
<h1>Ошибка аналитики TikTok</h1>

<p>
${String(
  error?.message || "Unknown error"
)}
</p>
`
    };
  }
};
