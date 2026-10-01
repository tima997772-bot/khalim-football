exports.handler = async (event) => {
  return {
    statusCode: 200,

    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-cache"
    },

    body: `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>Khalim Football — Test</title>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  background: #f5f5f7;
  padding: 20px;
}

.card {
  max-width: 600px;
  margin: 40px auto;
  background: white;
  padding: 25px;
  border-radius: 20px;
  box-shadow: 0 5px 25px rgba(0,0,0,.08);
}

.ok {
  font-size: 22px;
  font-weight: 700;
}

pre {
  background: #f1f1f1;
  padding: 15px;
  border-radius: 10px;
  overflow: auto;
}
</style>
</head>

<body>

<div class="card">

<div class="ok">
✅ Netlify Function работает
</div>

<hr>

<p>
Функция:
<b>tiktok-upload-panel</b>
</p>

<p>
Метод запроса:
<b>${event.httpMethod}</b>
</p>

<p>
Время:
<b>${new Date().toISOString()}</b>
</p>

<h3>Следующий этап</h3>

<p>
Если эта страница открылась, значит маршрут Netlify исправен.
После этого вернём загрузку видео в TikTok.
</p>

<pre>
Status: OK
Function: tiktok-upload-panel
</pre>

</div>

</body>
</html>
`
  };
};
