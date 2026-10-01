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
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,like_count,comment_count,share_count,view_count,duration",
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

    const averageViews = totalViews / videos.length;

    const engagement =
      totalViews > 0
        ? ((totalLikes + totalComments + totalShares) /
            totalViews) *
          100
        : 0;

    const topVideo = [...videos].sort(
      (a, b) =>
        Number(b.view_count || 0) -
        Number(a.view_count || 0)
    )[0];

    const topViews = Number(topVideo.view_count || 0);

    /*
      Выбор следующего формата.

      Важно:
      TikTok API не сообщает нам содержание видео,
      поэтому алгоритм не притворяется, что знает,
      какой именно формат был у каждого ролика.

      Решение основывается только на реальных
      количественных показателях аккаунта.
    */

    let selectedFormat;
    let hook;
    let task;
    let reason;

    if (topViews >= averageViews * 1.7) {
      selectedFormat = "Игровой момент";
      hook = "Смотри, что произошло дальше.";
      task =
        "Взять сильный реальный футбольный эпизод и начать видео непосредственно с действия.";
      reason =
        "Лучший ролик значительно выше среднего по просмотрам. Следует протестировать динамичную подачу.";
    } else if (engagement >= 3) {
      selectedFormat = "Эмоция + история";
      hook = "Вот ради этого стоит продолжать.";
      task =
        "Показать эмоциональный момент после тренировки или матча и добавить короткую историю.";
      reason =
        "Текущая вовлечённость позволяет тестировать контент, который провоцирует реакцию аудитории.";
    } else if (averageViews < 300) {
      selectedFormat = "Тренировка";
      hook = "Сможешь повторить?";
      task =
        "Снять одно конкретное упражнение крупным планом и показать результат в первые секунды.";
      reason =
        "Средние просмотры пока невысокие, поэтому нужен простой визуальный Hook и понятное действие.";
    } else {
      selectedFormat = "Путь футболиста";
      hook = "Каждый день становлюсь лучше.";
      task =
        "Собрать короткий фрагмент тренировочного процесса с одним измеримым результатом.";
      reason =
        "Показатели позволяют продолжать тестирование сюжетного футбольного контента.";
    }

    const hashtags =
      "#футбол #football #soccer #футболист #тренировка";

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

<title>Khalim Football — Content Selector</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 20px;
  background: #101010;
  color: white;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 850px;
  margin: auto;
}

.header,
.card {
  background: #1c1c1c;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 18px;
}

.header h1 {
  margin-top: 0;
  font-size: 30px;
}

.label {
  color: #aaa;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.selected {
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0 20px;
}

.block {
  background: #292929;
  padding: 17px;
  border-radius: 14px;
  margin-top: 12px;
}

.block b {
  display: block;
  margin-bottom: 8px;
}

.block p {
  margin: 0;
  line-height: 1.5;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat {
  background: #292929;
  padding: 16px;
  border-radius: 14px;
}

.stat b {
  display: block;
  font-size: 24px;
  margin-top: 5px;
}

.note {
  color: #aaa;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .stats {
    grid-template-columns: 1fr;
  }
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>⚽ Khalim Football</h1>

<div class="label">
Следующий контент
</div>

<div class="selected">
${escapeHtml(selectedFormat)}
</div>

<p class="note">
Решение автоматически рассчитано по последним
${videos.length} видео TikTok.
</p>

</div>

<div class="card">

<h2>🎯 Задание</h2>

<div class="block">

<b>⚡ Hook</b>

<p>
${escapeHtml(hook)}
</p>

</div>

<div class="block">

<b>🎬 Что снять</b>

<p>
${escapeHtml(task)}
</p>

</div>

<div class="block">

<b>📊 Почему выбран этот формат</b>

<p>
${escapeHtml(reason)}
</p>

</div>

<div class="block">

<b>🏷 Хэштеги</b>

<p>
${hashtags}
</p>

</div>

</div>

<div class="card">

<h2>📈 Данные, на которых основан выбор</h2>

<div class="stats">

<div class="stat">
Видео
<b>${videos.length}</b>
</div>

<div class="stat">
Средние просмотры
<b>${Math.round(averageViews)}</b>
</div>

<div class="stat">
Лучшее видео
<b>${topViews}</b>
</div>

<div class="stat">
Вовлечённость
<b>${engagement.toFixed(2)}%</b>
</div>

</div>

</div>

<div class="card">

<h2>🔄 Следующий цикл</h2>

<p class="note">
После следующей публикации система снова получит
статистику TikTok и пересчитает рекомендацию.
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
