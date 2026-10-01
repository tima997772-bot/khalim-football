const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    const store = getStore("content-queue", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    let queue = await store.get("queue", {
      type: "json"
    });

    // Если очередь ещё не создана — создаём первую неделю
    if (!queue || !Array.isArray(queue.items) || queue.items.length === 0) {
      queue = {
        created_at: new Date().toISOString(),
        items: [
          {
            id: 1,
            day: "День 1",
            format: "Игровой момент",
            hook: "Смотри, что произошло дальше.",
            task: "Сильный игровой эпизод с действием с первой секунды.",
            status: "Снять"
          },
          {
            id: 2,
            day: "День 2",
            format: "Тренировка",
            hook: "Сможешь повторить?",
            task: "Одно футбольное упражнение и его результат.",
            status: "Снять"
          },
          {
            id: 3,
            day: "День 3",
            format: "Путь футболиста",
            hook: "Результат начинается не на матче.",
            task: "Показать тренировочный процесс и прогресс.",
            status: "Снять"
          },
          {
            id: 4,
            day: "День 4",
            format: "Навык полузащитника",
            hook: "Вот что важно для полузащитника.",
            task: "Показать передачу, обработку или игровое решение.",
            status: "Снять"
          },
          {
            id: 5,
            day: "День 5",
            format: "Эмоция",
            hook: "Вот ради чего проходят тренировки.",
            task: "Эмоциональный момент после тренировки или матча.",
            status: "Снять"
          },
          {
            id: 6,
            day: "День 6",
            format: "Мини-челлендж",
            hook: "Сколько повторений сделаешь ты?",
            task: "Короткий футбольный челлендж.",
            status: "Снять"
          },
          {
            id: 7,
            day: "День 7",
            format: "Итоги недели",
            hook: "7 дней работы — вот результат.",
            task: "Лучшие моменты недели в динамичном монтаже.",
            status: "Снять"
          }
        ]
      };

      await store.setJSON("queue", queue);
    }

    const rows = queue.items.map((item) => `
      <div class="item">

        <div class="day">${escapeHtml(item.day)}</div>

        <h2>${escapeHtml(item.format)}</h2>

        <div class="block">
          <b>⚡ Hook</b>
          <p>${escapeHtml(item.hook)}</p>
        </div>

        <div class="block">
          <b>🎬 Задание</b>
          <p>${escapeHtml(item.task)}</p>
        </div>

        <div class="status">
          ${statusIcon(item.status)}
          ${escapeHtml(item.status)}
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

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>Khalim Football — Content Queue</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 20px;
  background: #101010;
  color: #fff;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 850px;
  margin: auto;
}

.header,
.item {
  background: #1c1c1c;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 18px;
}

.header h1 {
  margin-top: 0;
  font-size: 30px;
}

.header p {
  color: #aaa;
  line-height: 1.5;
}

.day {
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 14px;
}

.item h2 {
  font-size: 25px;
  margin-top: 8px;
}

.block {
  background: #292929;
  padding: 16px;
  border-radius: 14px;
  margin-top: 12px;
}

.block b {
  display: block;
  margin-bottom: 7px;
}

.block p {
  margin: 0;
  line-height: 1.5;
}

.status {
  display: inline-block;
  margin-top: 15px;
  padding: 9px 14px;
  border-radius: 20px;
  background: #292929;
  font-weight: bold;
}

.legend {
  color: #aaa;
  line-height: 1.8;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>⚽ Khalim Football</h1>

<h2>📋 Очередь контента</h2>

<p>
7 следующих публикаций для @khalim_football.
</p>

<div class="legend">
🟡 Снять → 🔵 Готово → 🟢 Опубликовано
</div>

</div>

${rows}

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

function statusIcon(status) {
  if (status === "Опубликовано") return "🟢";
  if (status === "Готово") return "🔵";
  return "🟡";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
