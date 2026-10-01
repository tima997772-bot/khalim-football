const { getStore } = require("@netlify/blobs");

const STATUSES = [
  "Снять",
  "Готово",
  "Опубликовано"
];

exports.handler = async (event) => {
  try {
    const store = getStore("content-queue", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    // =========================
    // POST — изменение статуса
    // =========================

    if (event.httpMethod === "POST") {
      const adminKey = process.env.CONTENT_ADMIN_KEY;

      const providedKey =
        event.headers["x-content-key"] ||
        event.headers["X-Content-Key"];

      if (!adminKey || providedKey !== adminKey) {
        return {
          statusCode: 401,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            success: false,
            error: "Unauthorized"
          })
        };
      }

      const body = JSON.parse(event.body || "{}");

      const id = Number(body.id);
      const status = body.status;

      if (!id || !STATUSES.includes(status)) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            success: false,
            error: "Invalid id or status"
          })
        };
      }

      const queue = await store.get("queue", {
        type: "json"
      });

      if (!queue || !Array.isArray(queue.items)) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            success: false,
            error: "Content queue not found"
          })
        };
      }

      const item = queue.items.find(
        (content) => Number(content.id) === id
      );

      if (!item) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            success: false,
            error: "Content item not found"
          })
        };
      }

      item.status = status;
      item.updated_at = new Date().toISOString();

      await store.setJSON("queue", queue);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
          success: true,
          item
        })
      };
    }

    // =========================
    // GET — показать очередь
    // =========================

    const queueData = await store.get("queue", {
      type: "json"
    });

    let queue = queueData;

    // Если очереди ещё нет — создаём
    if (
      !queue ||
      !Array.isArray(queue.items) ||
      queue.items.length === 0
    ) {
      queue = {
        created_at: new Date().toISOString(),

        items: [
          {
            id: 1,
            day: "День 1",
            format: "Игровой момент",
            hook: "Смотри, что произошло дальше.",
            task:
              "Сильный игровой эпизод с действием с первой секунды.",
            status: "Снять"
          },

          {
            id: 2,
            day: "День 2",
            format: "Тренировка",
            hook: "Сможешь повторить?",
            task:
              "Одно футбольное упражнение и его результат.",
            status: "Снять"
          },

          {
            id: 3,
            day: "День 3",
            format: "Путь футболиста",
            hook:
              "Результат начинается не на матче.",
            task:
              "Показать тренировочный процесс и прогресс.",
            status: "Снять"
          },

          {
            id: 4,
            day: "День 4",
            format: "Навык полузащитника",
            hook:
              "Вот что важно для полузащитника.",
            task:
              "Показать передачу, обработку или игровое решение.",
            status: "Снять"
          },

          {
            id: 5,
            day: "День 5",
            format: "Эмоция",
            hook:
              "Вот ради чего проходят тренировки.",
            task:
              "Эмоциональный момент после тренировки или матча.",
            status: "Снять"
          },

          {
            id: 6,
            day: "День 6",
            format: "Мини-челлендж",
            hook:
              "Сколько повторений сделаешь ты?",
            task:
              "Короткий футбольный челлендж.",
            status: "Снять"
          },

          {
            id: 7,
            day: "День 7",
            format: "Итоги недели",
            hook:
              "7 дней работы — вот результат.",
            task:
              "Лучшие моменты недели в динамичном монтаже.",
            status: "Снять"
          }
        ]
      };

      await store.setJSON("queue", queue);
    }

    // =========================
    // HTML карточки
    // =========================

    const rows = queue.items
      .map((item) => {
        return `
        <div class="item">

          <div class="day">
            ${escapeHtml(item.day)}
          </div>

          <h2>
            ${escapeHtml(item.format)}
          </h2>

          <div class="block">
            <b>⚡ Hook</b>
            <p>
              ${escapeHtml(item.hook)}
            </p>
          </div>

          <div class="block">
            <b>🎬 Задание</b>
            <p>
              ${escapeHtml(item.task)}
            </p>
          </div>

          <div class="current-status">
            ${statusIcon(item.status)}
            ${escapeHtml(item.status)}
          </div>

          <div class="buttons">

            <button
              onclick="changeStatus(${item.id}, 'Снять')"
              class="yellow"
            >
              🟡 Снять
            </button>

            <button
              onclick="changeStatus(${item.id}, 'Готово')"
              class="blue"
            >
              🔵 Готово
            </button>

            <button
              onclick="changeStatus(${item.id}, 'Опубликовано')"
              class="green"
            >
              🟢 Опубликовано
            </button>

          </div>

        </div>
        `;
      })
      .join("");

    // =========================
    // Страница
    // =========================

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",
        "Cache-Control":
          "no-store, no-cache, must-revalidate"
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
Khalim Football — Content Queue
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
      #202020 0%,
      #101010 45%,
      #080808 100%
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
  max-width: 850px;
  margin: auto;
}

.header,
.item {
  background: rgba(28,28,28,.96);

  border: 1px solid #303030;

  border-radius: 22px;

  padding: 24px;

  margin-bottom: 18px;

  box-shadow:
    0 12px 35px rgba(0,0,0,.25);
}

.header h1 {
  margin: 0 0 10px;

  font-size: 30px;
}

.header h2 {
  margin: 0 0 12px;

  font-size: 22px;
}

.header p {
  color: #aaa;

  line-height: 1.5;
}

.legend {
  margin-top: 18px;

  color: #aaa;

  line-height: 1.8;
}

.day {
  color: #999;

  text-transform: uppercase;

  letter-spacing: 1px;

  font-size: 13px;
}

.item h2 {
  margin: 8px 0 18px;

  font-size: 25px;
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

.current-status {
  display: inline-block;

  margin-top: 16px;

  padding: 10px 15px;

  border-radius: 20px;

  background: #292929;

  font-weight: bold;
}

.buttons {
  display: flex;

  flex-wrap: wrap;

  gap: 10px;

  margin-top: 16px;
}

button {
  border: none;

  border-radius: 12px;

  padding: 12px 15px;

  color: #fff;

  font-size: 14px;

  font-weight: 700;

  cursor: pointer;

  transition:
    transform .15s,
    opacity .15s;
}

button:hover {
  transform: translateY(-1px);

  opacity: .9;
}

button:active {
  transform: scale(.97);
}

.yellow {
  background: #8a6a00;
}

.blue {
  background: #1558a6;
}

.green {
  background: #137333;
}

button.loading {
  opacity: .5;

  pointer-events: none;
}

.success {
  position: fixed;

  left: 50%;

  bottom: 25px;

  transform: translateX(-50%);

  background: #137333;

  color: #fff;

  padding: 13px 20px;

  border-radius: 14px;

  font-weight: 700;

  display: none;

  z-index: 1000;

  box-shadow:
    0 10px 30px rgba(0,0,0,.4);
}

.error {
  position: fixed;

  left: 50%;

  bottom: 25px;

  transform: translateX(-50%);

  background: #9b1c1c;

  color: #fff;

  padding: 13px 20px;

  border-radius: 14px;

  font-weight: 700;

  display: none;

  z-index: 1000;
}

@media (max-width: 600px) {

  body {
    padding: 12px;
  }

  .header,
  .item {
    padding: 18px;

    border-radius: 18px;
  }

  .buttons {
    flex-direction: column;
  }

  button {
    width: 100%;
  }

}

</style>

</head>

<body>

<div class="container">

  <div class="header">

    <h1>
      ⚽ Khalim Football
    </h1>

    <h2>
      📋 Очередь контента
    </h2>

    <p>
      7 следующих публикаций
      для @khalim_football.
    </p>

    <div class="legend">
      🟡 Снять →
      🔵 Готово →
      🟢 Опубликовано
    </div>

  </div>

  ${rows}

</div>

<div id="success" class="success">
  Статус обновлён
</div>

<div id="error" class="error">
  Ошибка обновления
</div>

<script>

async function changeStatus(id, status) {

  const key = prompt(
    "Введите CONTENT_ADMIN_KEY:"
  );

  if (!key) {
    return;
  }

  const buttons =
    document.querySelectorAll("button");

  buttons.forEach(
    (button) =>
      button.classList.add("loading")
  );

  try {

    const response = await fetch(
      window.location.pathname,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Content-Key":
            key
        },

        body: JSON.stringify({
          id: id,
          status: status
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Ошибка обновления"
      );
    }

    showSuccess(
      "Статус обновлён: " +
      status
    );

    setTimeout(
      () => location.reload(),
      500
    );

  } catch (error) {

    console.error(error);

    showError(
      error.message ||
      "Ошибка обновления"
    );

    buttons.forEach(
      (button) =>
        button.classList.remove("loading")
    );
  }
}

function showSuccess(message) {

  const element =
    document.getElementById(
      "success"
    );

  element.textContent = message;

  element.style.display =
    "block";

  setTimeout(
    () =>
      element.style.display =
        "none",
    2500
  );
}

function showError(message) {

  const element =
    document.getElementById(
      "error"
    );

  element.textContent = message;

  element.style.display =
    "block";

  setTimeout(
    () =>
      element.style.display =
        "none",
    3000
  );
}

</script>

</body>

</html>
`
    };

  } catch (error) {

    console.error(error);

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "text/plain; charset=UTF-8"
      },

      body:
        `Server error: ${error.message}`
    };
  }
};


// =========================
// Вспомогательные функции
// =========================

function statusIcon(status) {

  if (status === "Опубликовано") {
    return "🟢";
  }

  if (status === "Готово") {
    return "🔵";
  }

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
