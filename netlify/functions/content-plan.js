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

    const averageViews = Math.round(totalViews / videos.length);

    const bestVideo = [...videos].sort(
      (a, b) =>
        Number(b.view_count || 0) -
        Number(a.view_count || 0)
    )[0];

    const bestViews = Number(bestVideo.view_count || 0);

    let strategy;

    if (bestViews >= averageViews * 1.7) {
      strategy =
        "Повторить структуру самых успешных роликов, сохранив новое содержание.";
    } else {
      strategy =
        "Тестировать разные футбольные форматы и сравнивать результаты.";
    }

    const plan = [
      {
        day: "День 1",
        format: "Игровой момент",
        hook: "Смотри до конца — вот что получилось.",
        video: "Короткий динамичный момент с футбольного поля.",
        text: "Каждый момент — это опыт.",
        reason: "Показываем реальную игру и действие с первых секунд."
      },
      {
        day: "День 2",
        format: "Тренировка",
        hook: "А ты смог бы повторить это?",
        video: "Одно конкретное упражнение с мячом в динамике.",
        text: "Повторяю, пока не получится.",
        reason: "Челлендж повышает вероятность реакции аудитории."
      },
      {
        day: "День 3",
        format: "Путь футболиста",
        hook: "Результат начинается не на матче.",
        video: "Короткая последовательность тренировочных эпизодов.",
        text: "Работа сегодня — результат завтра.",
        reason: "Формируем историю прогресса футболиста."
      },
      {
        day: "День 4",
        format: "Навык полузащитника",
        hook: "Вот что важно для полузащитника.",
        video: "Передача, обработка мяча, разворот или другое игровое действие.",
        text: "Контроль. Решение. Скорость.",
        reason: "Подчёркиваем игровую специализацию."
      },
      {
        day: "День 5",
        format: "Эмоция",
        hook: "Вот ради чего проходят все тренировки.",
        video: "Эмоциональный момент после удачного действия или игры.",
        text: "Эмоции остаются навсегда.",
        reason: "Добавляем личность и эмоциональную связь."
      },
      {
        day: "День 6",
        format: "Мини-челлендж",
        hook: "Сколько повторений сделаешь ты?",
        video: "Футбольный челлендж с понятным результатом.",
        text: "Проверяем себя.",
        reason: "Создаём повод для комментариев и повторения."
      },
      {
        day: "День 7",
        format: "Итоги недели",
        hook: "7 дней работы — вот результат.",
        video: "Лучшие моменты недели в быстром монтаже.",
        text: "Неделя закончилась. Путь продолжается.",
        reason: "Связываем публикации в единую историю."
      }
    ];

    const cards = plan.map((item, index) => `
      <div class="card">
        <div class="day">${item.day}</div>
        <h2>${item.format}</h2>

        <div class="block">
          <b>⚡ HOOK</b>
          <p>${escapeHtml(item.hook)}</p>
        </div>

        <div class="block">
          <b>🎬 Что снять</b>
          <p>${escapeHtml(item.video)}</p>
        </div>

        <div class="block">
          <b>📝 Текст на экране</b>
          <p>${escapeHtml(item.text)}</p>
        </div>

        <div class="block">
          <b>📊 Почему этот формат</b>
          <p>${escapeHtml(item.reason)}</p>
        </div>

        <div class="hashtags">
          #футбол #football #тренировка #футболист #soccer
        </div>
      </div>
    `).join("");

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
<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>Khalim Football — Контент-план</title>

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
  max-width: 900px;
  margin: auto;
}

.header {
  background: #1c1c1c;
  padding: 28px;
  border-radius: 20px;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 10px;
  font-size: 30px;
}

.header p {
  color: #ccc;
  line-height: 1.5;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
}

.stat {
  background: #292929;
  border-radius: 14px;
  padding: 18px;
}

.stat b {
  display: block;
  font-size: 25px;
  margin-top: 5px;
}

.card {
  background: #1c1c1c;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 18px;
}

.day {
  font-size: 15px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card h2 {
  margin-top: 8px;
  font-size: 25px;
}

.block {
  background: #292929;
  border-radius: 12px;
  padding: 15px;
  margin-top: 12px;
}

.block b {
  font-size: 14px;
}

.block p {
  margin: 8px 0 0;
  line-height: 1.5;
}

.hashtags {
  margin-top: 15px;
  color: #aaa;
  line-height: 1.5;
}

.strategy {
  background: #202020;
  border-radius: 15px;
  padding: 20px;
  margin-top: 20px;
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

<p>
Автоматический контент-план для
@khalim_football на основе статистики
последних TikTok-видео.
</p>

<div class="stats">

<div class="stat">
Последние видео
<b>${videos.length}</b>
</div>

<div class="stat">
Средние просмотры
<b>${averageViews}</b>
</div>

<div class="stat">
Лучшее видео
<b>${bestViews}</b>
</div>

<div class="stat">
Стратегия
<b>7 дней</b>
</div>

</div>

<div class="strategy">
<b>🎯 Стратегия:</b>
<p>${escapeHtml(strategy)}</p>
</div>

</div>

${cards}

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
