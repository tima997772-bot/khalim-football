const { getStore } = require("@netlify/blobs");

const TIKTOK_FIELDS =
  "id,title,video_description,like_count,comment_count,share_count,view_count,duration";

exports.handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";

    // =========================
    // Получаем TikTok token
    // =========================

    const tokenStore = getStore("tiktok-tokens", {
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_AUTH_TOKEN
    });

    const keys = await tokenStore.list();

    if (!keys.blobs || keys.blobs.length === 0) {
      return htmlError("TikTok аккаунт не подключён.");
    }

    const tokenData = await tokenStore.get(
      keys.blobs[0].key,
      { type: "json" }
    );

    if (!tokenData?.access_token) {
      return htmlError("TikTok access token не найден.");
    }

    // =========================
    // Получаем последние видео
    // =========================

    const response = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${TIKTOK_FIELDS}`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          max_count: 20
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return htmlError(
        data.error?.message ||
        "TikTok API error"
      );
    }

    const videos =
      data.data?.videos || [];

    if (!videos.length) {
      return htmlError(
        "TikTok видео не найдены."
      );
    }

    // =========================
    // Аналитика
    // =========================

    const totalViews = videos.reduce(
      (sum, video) =>
        sum +
        Number(video.view_count || 0),
      0
    );

    const totalLikes = videos.reduce(
      (sum, video) =>
        sum +
        Number(video.like_count || 0),
      0
    );

    const totalComments = videos.reduce(
      (sum, video) =>
        sum +
        Number(video.comment_count || 0),
      0
    );

    const totalShares = videos.reduce(
      (sum, video) =>
        sum +
        Number(video.share_count || 0),
      0
    );

    const averageViews =
      totalViews / videos.length;

    const averageLikes =
      totalLikes / videos.length;

    const engagement =
      totalViews > 0
        ? (
            (
              totalLikes +
              totalComments +
              totalShares
            ) /
            totalViews
          ) * 100
        : 0;

    // =========================
    // Лучшее видео
    // =========================

    const sorted =
      [...videos].sort(
        (a, b) =>
          Number(b.view_count || 0) -
          Number(a.view_count || 0)
      );

    const topVideo =
      sorted[0];

    const topViews =
      Number(
        topVideo?.view_count || 0
      );

    const topLikes =
      Number(
        topVideo?.like_count || 0
      );

    const topComments =
      Number(
        topVideo?.comment_count || 0
      );

    const topShares =
      Number(
        topVideo?.share_count || 0
      );

    // =========================
    // Автоматический стратег
    // =========================

    let format;
    let hook;
    let task;
    let reason;

    if (
      topViews >=
      averageViews * 1.7
    ) {

      format =
        "Игровой момент";

      hook =
        "Смотри, что произошло дальше.";

      task =
        "Начать видео сразу с сильного игрового действия: обводка, передача, удар, отбор или другое яркое действие.";

      reason =
        "Лучшее видео заметно выше среднего по просмотрам. Поэтому система усиливает динамичный футбольный контент.";

    } else if (
      engagement >= 3
    ) {

      format =
        "Эмоция + история";

      hook =
        "Вот ради этого стоит продолжать.";

      task =
        "Показать эмоциональный момент после тренировки или матча и добавить короткую историю.";

      reason =
        "Вовлечённость аудитории позволяет тестировать эмоциональный и сюжетный формат.";

    } else if (
      averageViews < 300
    ) {

      format =
        "Тренировка";

      hook =
        "Сможешь повторить?";

      task =
        "Показать одно конкретное упражнение и его результат. Первые секунды должны содержать действие.";

      reason =
        "Средние просмотры ниже 300. Система выбирает максимально понятный визуальный формат с быстрым Hook.";

    } else if (
      totalShares >
      totalLikes * 0.3
    ) {

      format =
        "Челлендж";

      hook =
        "А ты сможешь так же?";

      task =
        "Сделать короткий футбольный челлендж с понятным условием и результатом.";

      reason =
        "Доля репостов относительно лайков показывает потенциал контента, которым хочется поделиться.";

    } else {

      format =
        "Путь футболиста";

      hook =
        "Каждый день становлюсь лучше.";

      task =
        "Показать один фрагмент тренировочного процесса и конкретный результат.";

      reason =
        "Текущие показатели требуют дальнейшего тестирования разных сюжетных форматов.";

    }

    const hashtags =
      "#футбол #football #soccer #футболист #тренировка";

    // =========================
    // POST — применить решение
    // =========================

    if (method === "POST") {

      const adminKey =
        process.env.CONTENT_ADMIN_KEY;

      const providedKey =
        event.headers["x-content-key"] ||
        event.headers["X-Content-Key"];

      if (
        !adminKey ||
        providedKey !== adminKey
      ) {
        return {
          statusCode: 401,

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            success: false,
            error: "Unauthorized"
          })
        };
      }

      const queueStore =
        getStore("content-queue", {
          siteID:
            process.env.SITE_ID,

          token:
            process.env.NETLIFY_AUTH_TOKEN
        });

      const queue =
        await queueStore.get(
          "queue",
          { type: "json" }
        );

      if (
        !queue ||
        !Array.isArray(queue.items)
      ) {
        return htmlError(
          "Очередь контента не найдена."
        );
      }

      // Находим ближайшую публикацию,
      // которую ещё нужно снять.

      const item =
        queue.items.find(
          (content) =>
            content.status === "Снять"
        );

      if (!item) {
        return htmlError(
          "В очереди нет публикаций со статусом «Снять»."
        );
      }

      // Обновляем первое задание

      item.format = format;
      item.hook = hook;
      item.task = task;
      item.reason = reason;
      item.hashtags = hashtags;

      item.ai_selected = true;

      item.ai_selected_at =
        new Date().toISOString();

      await queueStore.setJSON(
        "queue",
        queue
      );

      return {
        statusCode: 200,

        headers: {
          "Content-Type":
            "application/json; charset=UTF-8"
        },

        body: JSON.stringify({
          success: true,

          item,

          analytics: {
            videos: videos.length,
            totalViews,
            averageViews:
              Math.round(
                averageViews
              ),
            averageLikes:
              Number(
                averageLikes.toFixed(1)
              ),
            engagement:
              Number(
                engagement.toFixed(2)
              ),
            topViews
          },

          recommendation: {
            format,
            hook,
            task,
            reason,
            hashtags
          }
        })
      };
    }

    // =========================
    // GET — показать рекомендацию
    // =========================

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body: renderPage({
        videos: videos.length,
        totalViews,
        averageViews,
        averageLikes,
        engagement,
        topViews,
        topLikes,
        topComments,
        topShares,
        format,
        hook,
        task,
        reason,
        hashtags
      })
    };

  } catch (error) {

    console.error(error);

    return htmlError(
      error.message ||
      "Unknown server error"
    );
  }
};


// =================================
// HTML
// =================================

function renderPage(data) {

  return `
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>

<title>
Khalim Football — Auto Content
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

.card {
  background: #1c1c1c;

  border:
    1px solid #303030;

  border-radius: 22px;

  padding: 24px;

  margin-bottom: 18px;
}

h1 {
  font-size: 30px;

  margin:
    0 0 8px;
}

h2 {
  font-size: 24px;

  margin:
    0 0 18px;
}

p {
  line-height: 1.55;
}

.stats {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 12px;
}

.stat {
  background: #292929;

  border-radius: 15px;

  padding: 16px;
}

.stat b {
  display: block;

  font-size: 24px;

  margin-top: 5px;
}

.recommendation {
  background:
    linear-gradient(
      135deg,
      #1d3a24,
      #162119
    );

  border:
    1px solid #315c3b;
}

.label {
  color: #aaa;

  font-size: 13px;

  text-transform: uppercase;

  letter-spacing: 1px;
}

.big {
  font-size: 30px;

  font-weight: 800;

  margin:
    8px 0 20px;
}

.box {
  background: rgba(0,0,0,.25);

  padding: 16px;

  border-radius: 14px;

  margin-top: 12px;
}

button {
  width: 100%;

  border: none;

  border-radius: 14px;

  padding: 16px;

  margin-top: 18px;

  background: #16803a;

  color: white;

  font-size: 17px;

  font-weight: 800;
}

button:active {
  transform: scale(.98);
}

.note {
  color: #999;

  font-size: 13px;

  margin-top: 12px;
}

@media (max-width: 600px) {

  body {
    padding: 12px;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .card {
    padding: 18px;
  }

}

</style>

</head>

<body>

<div class="container">

  <div class="card">

    <h1>
      ⚽ Khalim Football
    </h1>

    <p>
      Автоматический выбор следующего
      футбольного контента для
      @khalim_football.
    </p>

  </div>

  <div class="card">

    <h2>
      📊 Анализ TikTok
    </h2>

    <div class="stats">

      <div class="stat">
        Видео
        <b>${data.videos}</b>
      </div>

      <div class="stat">
        Просмотры
        <b>${data.totalViews}</b>
      </div>

      <div class="stat">
        Средние просмотры
        <b>${Math.round(
          data.averageViews
        )}</b>
      </div>

      <div class="stat">
        Средние лайки
        <b>${data.averageLikes.toFixed(
          1
        )}</b>
      </div>

      <div class="stat">
        Вовлечённость
        <b>${data.engagement.toFixed(
          2
        )}%</b>
      </div>

      <div class="stat">
        Лучшее видео
        <b>${data.topViews}</b>
      </div>

    </div>

  </div>

  <div class="card recommendation">

    <div class="label">
      🎯 Следующее задание
    </div>

    <div class="big">
      ${escapeHtml(
        data.format
      )}
    </div>

    <div class="box">

      <div class="label">
        ⚡ Hook
      </div>

      <p>
        ${escapeHtml(
          data.hook
        )}
      </p>

    </div>

    <div class="box">

      <div class="label">
        🎬 Что снять
      </div>

      <p>
        ${escapeHtml(
          data.task
        )}
      </p>

    </div>

    <div class="box">

      <div class="label">
        🧠 Почему выбрано
      </div>

      <p>
        ${escapeHtml(
          data.reason
        )}
      </p>

    </div>

    <div class="box">

      <div class="label">
        #️⃣ Hashtags
      </div>

      <p>
        ${escapeHtml(
          data.hashtags
        )}
      </p>

    </div>

    <button
      onclick="applyRecommendation()"
    >
      🚀 Применить к очереди
    </button>

    <div class="note">
      После применения первое задание
      со статусом «Снять» будет обновлено
      этой рекомендацией.
    </div>

  </div>

</div>

<script>

async function applyRecommendation() {

  const key =
    prompt(
      "Введите CONTENT_ADMIN_KEY:"
    );

  if (!key) {
    return;
  }

  try {

    const response =
      await fetch(
        window.location.pathname,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Content-Key":
              key
          }
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.error ||
        "Ошибка"
      );
    }

    alert(
      "Готово! Задание «" +
      data.item.format +
      "» добавлено в очередь."
    );

    location.href =
      "/.netlify/functions/content-queue";

  } catch (error) {

    alert(
      error.message ||
      "Ошибка обновления"
    );

  }

}

</script>

</body>

</html>
`;
}


// =================================
// Ошибка
// =================================

function htmlError(message) {

  return {
    statusCode: 500,

    headers: {
      "Content-Type":
        "text/html; charset=UTF-8"
    },

    body: `
      <html lang="ru">
      <body style="
        background:#101010;
        color:white;
        font-family:Arial;
        padding:30px;
      ">
        <h1>⚠️ Ошибка</h1>
        <p>${escapeHtml(
          message
        )}</p>
      </body>
      </html>
    `
  };
}


// =================================
// Защита HTML
// =================================

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
