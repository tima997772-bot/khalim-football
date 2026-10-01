const { getStore } = require("@netlify/blobs");

exports.handler = async () => {
  try {
    // Получаем сохранённый TikTok-токен
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

    // Получаем последние 20 видео TikTok
    const tikTokResponse = await fetch(
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

    const tikTokData = await tikTokResponse.json();

    if (!tikTokResponse.ok || tikTokData.error?.code !== "ok") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(tikTokData)
      };
    }

    const videos = tikTokData.data?.videos || [];

    if (!videos.length) {
      return {
        statusCode: 404,
        body: "Видео TikTok не найдены"
      };
    }

    // Подготавливаем данные для ИИ
    const statistics = videos.map((video, index) => ({
      number: index + 1,
      title:
        video.title ||
        video.video_description ||
        "Без названия",
      views: Number(video.view_count || 0),
      likes: Number(video.like_count || 0),
      comments: Number(video.comment_count || 0),
      shares: Number(video.share_count || 0),
      duration: Number(video.duration || 0)
    }));

    const prompt = `
Ты — AI-контент-стратег футбольного аккаунта @khalim_football.

Это аккаунт молодого футболиста-полузащитника.

Проанализируй статистику последних видео TikTok.

Твоя задача:
1. Найти форматы, которые получили больше всего просмотров.
2. Определить, какие ролики вызывают больше реакций.
3. Определить слабые места контента.
4. Предложить 5 конкретных идей следующих роликов.
5. Для каждой идеи дать короткий Hook для первых 1–2 секунд.
6. Предложить формат: тренировка, матч, эмоция, история, челлендж или полезный совет.
7. Сформировать план публикаций на ближайшие 7 дней.
8. Не выдумывай данные, которых нет в статистике.

Главный принцип:
реальные футбольные видео должны быть основой контента, а мотивационные изображения — дополнительным контентом.

Ответ дай на русском языке.

СТАТИСТИКА:
${JSON.stringify(statistics, null, 2)}
`;

    // Запрос к OpenAI Responses API
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: prompt
        })
      }
    );

    const openAIData = await openAIResponse.json();

    if (!openAIResponse.ok) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(openAIData, null, 2)
      };
    }

    const analysis =
      openAIData.output_text ||
      openAIData.output
        ?.flatMap(item => item.content || [])
        ?.find(item => item.type === "output_text")
        ?.text ||
      "ИИ не вернул текст анализа.";

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
<title>Khalim Football — AI Analytics</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #111;
  color: #fff;
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
  line-height: 1.6;
}
h1 {
  font-size: 28px;
}
.card {
  background: #1d1d1d;
  padding: 24px;
  border-radius: 16px;
  white-space: pre-wrap;
}
</style>
</head>
<body>
<h1>Khalim Football</h1>
<h2>AI-анализ TikTok @khalim_football</h2>

<div class="card">${analysis}</div>

</body>
</html>
`
    };

  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8"
      },
      body: `Server error: ${error.message}`
    };
  }
};