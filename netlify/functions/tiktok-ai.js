const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const keys = await store.list();

    if (!keys.blobs || keys.blobs.length === 0) {
      return {
        statusCode: 404,
        body: "TikTok token not found"
      };
    }

    const tokenData = await store.get(keys.blobs[0].key, {
      type: "json"
    });

    if (!tokenData?.access_token) {
      return {
        statusCode: 404,
        body: "TikTok access token not found"
      };
    }

    const response = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,title,video_description,like_count,comment_count,share_count,view_count,duration",
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data, null, 2)
      };
    }

    const videos = data.data?.videos || [];

    if (!videos.length) {
      return {
        statusCode: 404,
        body: "Видео не найдены"
      };
    }

    const totalViews = videos.reduce(
      (sum, v) => sum + Number(v.view_count || 0),
      0
    );

    const totalLikes = videos.reduce(
      (sum, v) => sum + Number(v.like_count || 0),
      0
    );

    const totalComments = videos.reduce(
      (sum, v) => sum + Number(v.comment_count || 0),
      0
    );

    const totalShares = videos.reduce(
      (sum, v) => sum + Number(v.share_count || 0),
      0
    );

    const averageViews = Math.round(totalViews / videos.length);
    const averageLikes = Math.round(totalLikes / videos.length);

    const engagement =
      totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews * 100)
            .toFixed(2)
        : "0.00";

    const sorted = [...videos].sort(
      (a, b) =>
        Number(b.view_count || 0) -
        Number(a.view_count || 0)
    );

    const topVideos = sorted.slice(0, 5);

    const topAverage =
      topVideos.reduce(
        (sum, v) => sum + Number(v.view_count || 0),
        0
      ) / topVideos.length;

    const recommendations = [];

    if (averageViews < 300) {
      recommendations.push(
        "Усилить первые 1–2 секунды: сразу показывать действие, результат или интригу."
      );
    }

    if (averageLikes < 10) {
      recommendations.push(
        "Добавлять эмоциональный момент или вопрос, который провоцирует реакцию."
      );
    }

    if (totalShares > totalLikes * 0.3) {
      recommendations.push(
        "Форматы с высокой долей репостов стоит повторно тестировать."
      );
    }

    if (topAverage > averageViews * 1.5) {
      recommendations.push(
        "Изучить топ-5 роликов и сделать несколько новых видео по похожей структуре."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Продолжать тестировать разные футбольные форматы и сравнивать результаты."
      );
    }

    const rows = topVideos.map((video, i) => {
      const title =
        video.title ||
        video.video_description ||
        "Без названия";

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(title)}</td>
          <td>${video.view_count || 0}</td>
          <td>${video.like_count || 0}</td>
          <td>${video.comment_count || 0}</td>
          <td>${video.share_count || 0}</td>
        </tr>
      `;
    }).join("");

    const recommendationList = recommendations
      .map(item => `<li>${escapeHtml(item)}</li>`)
      .join("");

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
<title>Khalim Football — Smart Analytics</title>

<style>
body {
  font-family: Arial, sans-serif;
  background: #111;
  color: #fff;
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 950px;
  margin: auto;
}

.card {
  background: #1d1d1d;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat {
  background: #282828;
  padding: 16px;
  border-radius: 12px;
}

.stat b {
  display: block;
  font-size: 25px;
  margin-top: 5px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px;
  border-bottom: 1px solid #333;
  text-align: left;
}

ul {
  line-height: 1.8;
}

@media (max-width: 600px) {
  .stats {
    grid-template-columns: 1fr;
  }

  table {
    font-size: 13px;
  }
}
</style>
</head>

<body>

<div class="container">

<div class="card">
<h1>⚽ Khalim Football</h1>
<h2>Smart Analytics — @khalim_football</h2>
<p>Автоматический анализ последних видео TikTok без использования платного AI API.</p>
</div>

<div class="card">
<h2>Общая статистика</h2>

<div class="stats">

<div class="stat">
Видео
<b>${videos.length}</b>
</div>

<div class="stat">
Просмотры
<b>${totalViews}</b>
</div>

<div class="stat">
Средние просмотры
<b>${averageViews}</b>
</div>

<div class="stat">
Средние лайки
<b>${averageLikes}</b>
</div>

<div class="stat">
Комментарии
<b>${totalComments}</b>
</div>

<div class="stat">
Репосты
<b>${totalShares}</b>
</div>

<div class="stat">
Вовлечённость
<b>${engagement}%</b>
</div>

</div>
</div>

<div class="card">
<h2>🔥 Топ-5 видео</h2>

<table>
<tr>
<th>#</th>
<th>Видео</th>
<th>Просмотры</th>
<th>Лайки</th>
<th>Комментарии</th>
<th>Репосты</th>
</tr>

${rows}

</table>
</div>

<div class="card">
<h2>📈 Рекомендации</h2>
<ul>
${recommendationList}
</ul>
</div>

<div class="card">
<h2>🎯 Следующий шаг</h2>
<p>
Система будет использовать статистику предыдущих публикаций
для выбора форматов, которые стоит тестировать дальше.
</p>
</div>

</div>

</body>
</html>
`
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: `Server error: ${error.message}`
    };
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}