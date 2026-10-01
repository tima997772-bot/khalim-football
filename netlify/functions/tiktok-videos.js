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
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        },
        body: "<h1>Токен не найден</h1>"
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

    const response = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description,duration,title,like_count,comment_count,share_count,view_count",
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

    const rows = videos
      .map((video, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${video.title || video.video_description || "Без названия"}</td>
            <td>${video.view_count ?? 0}</td>
            <td>${video.like_count ?? 0}</td>
            <td>${video.comment_count ?? 0}</td>
            <td>${video.share_count ?? 0}</td>
            <td>${video.duration ?? 0} сек.</td>
          </tr>
        `;
      })
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
          <title>Khalim Football — TikTok Videos</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #f5f5f5;
            }

            h1 {
              font-size: 24px;
            }

            .info {
              margin-bottom: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
            }

            th, td {
              padding: 10px;
              border: 1px solid #ddd;
              text-align: left;
            }

            th {
              background: #222;
              color: white;
            }

            @media (max-width: 700px) {
              body {
                padding: 10px;
              }

              table {
                font-size: 12px;
              }

              th, td {
                padding: 7px;
              }
            }
          </style>
        </head>

        <body>

          <h1>TikTok — последние видео</h1>

          <div class="info">
            <p><strong>Аккаунт:</strong> khalim_football</p>
            <p><strong>Получено видео:</strong> ${videos.length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Видео</th>
                <th>Просмотры</th>
                <th>Лайки</th>
                <th>Комментарии</th>
                <th>Репосты</th>
                <th>Длительность</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

        </body>
        </html>
      `
    };

  } catch (error) {
    console.error("TikTok videos error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html; charset=UTF-8"
      },
      body: `
        <h1>Ошибка TikTok Videos API</h1>
        <p>${error.message || "Unknown error"}</p>
      `
    };
  }
};
