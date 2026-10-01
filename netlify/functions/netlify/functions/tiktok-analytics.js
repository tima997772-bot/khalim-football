const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    // Подключаем хранилище TikTok-токена
    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // Находим сохранённый аккаунт
    const keys = await store.list();

    if (!keys.blobs || keys.blobs.length === 0) {
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
        body: "<h1>Access token не найден</h1>"
      };
    }

    // Получаем последние 20 видео
    const response = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,video_description,title,like_count,comment_count,share_count,view_count,duration",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          max_count: 20
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error?.code !== "ok") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(data, null, 2)
      };
    }

    const videos = data.data?.videos || [];

    if (videos.length === 0) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: "<h1>Видео не найдены</h1>"
      };
    }

    // Общая статистика
    const totalViews = videos.reduce(
      (sum, video) => sum + Number(video.view_count || 0),
      0
    );

    const totalLikes = videos.reduce(
      (sum, video) => sum + Number(video.like_count || 0),
      0
    );

    const totalComments = videos.reduce(
      (sum, video) => sum + Number(video.comment_count || 0),
      0
    );

    const totalShares = videos.reduce(
      (sum, video) => sum + Number(video.share_count || 0),
      0
    );

    const averageViews = Math.round(totalViews / videos.length);
    const averageLikes = Math.round(totalLikes / videos.length);

    const engagement =
      totalViews > 0
        ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(2)
        : "0.00";

    // Сортируем видео по просмотрам
    const sortedVideos = [...videos].sort(
      (a, b) =>
        Number(b.view_count || 0) - Number(a.view_count || 0)
    );

    const bestVideos = sortedVideos.slice(0, 5);

    // Формируем список лучших видео
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

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${shortTitle}</td>
            <td>${video.view_count || 0}</td>
            <td>${video.like_count || 0}</td>
            <td>${video.comment_count || 0}</td>
            <td>${video.share_count || 0}</td>
          </tr>
        `;
      })
      .join("");

    // Простые рекомендации
    let recommendation = "";

    if (averageViews < 300) {
      recommendation +=
        "<li>Усилить первые 1–2 секунды ролика: результат, интрига или действие сразу.</li>";
    }

    if (engagement < 3) {
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
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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

    .recommendations {
      background: white;
      border-radius: 12px;
      padding: 18px;
      margin-top: 25px;
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
      <div class="label">Проанализировано видео</div>
      <div class="number">${videos.length}</div>
    </div>

    <div class="card">
      <div class="label">Всего просмотров</div>
      <div class="number">${totalViews}</div>
    </div>

    <div class="card">
      <div class="label">Средние просмотры</div>
      <div class="number">${averageViews}</div>
    </div>

    <div class="card">
      <div class="label">Средние лайки</div>
      <div class="number">${averageLikes}</div>
    </div>

    <div class="card">
      <div class="label">Всего комментариев</div>
      <div class="number">${totalComments}</div>
    </div>

    <div class="card">
      <div class="label">Всего репостов</div>
      <div class="number">${totalShares}</div>
    </div>

    <div class="card">
      <div class="label">Вовлечённость</div>
      <div class="number">${engagement}%</div>
    </div>

  </div>

  <h2>Топ-5 видео по просмотрам</h2>

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

    <h2>Рекомендации агента</h2>

    <ul>
      ${recommendation}
    </ul>

  </div>

</body>
</html>
`
    };

  } catch (error) {
    console.error("TikTok analytics error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: `
        <h1>Ошибка аналитики TikTok</h1>
        <p>${error.message || "Unknown error"}</p>
      `
    };
  }
};
