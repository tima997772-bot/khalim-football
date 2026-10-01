exports.handler = async (event) => {

  if (event.httpMethod === "GET") {

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

<title>Khalim Football</title>

<style>

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    Arial,
    sans-serif;

  background: #f5f5f7;
  padding: 20px;
}

.card {
  max-width: 600px;
  margin: 30px auto;
  background: white;
  padding: 25px;
  border-radius: 20px;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 15px;
  margin-top: 15px;
  font-size: 17px;
}

input[type="submit"] {
  background: #111;
  color: white;
  border: 0;
  border-radius: 12px;
  font-weight: 700;
}

</style>
</head>

<body>

<div class="card">

<h1>🎬 Khalim Football</h1>

<h2>Тест загрузки</h2>

<form
  action=""
  method="POST"
  enctype="multipart/form-data"
>

<input
  type="file"
  name="video"
  accept="video/mp4,video/quicktime,video/webm"
  required
>

<input
  type="password"
  name="admin_key"
  placeholder="CONTENT_ADMIN_KEY"
  required
>

<input
  type="submit"
  value="🚀 Загрузить видео"
>

</form>

</div>

</body>
</html>
`
    };
  }


  if (event.httpMethod === "POST") {

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      },

      body: `
<!DOCTYPE html>
<html lang="ru">

<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1">
</head>

<body style="
font-family:-apple-system,BlinkMacSystemFont,Arial;
padding:30px;
">

<h1>✅ Кнопка работает</h1>

<p>
POST-запрос успешно дошёл до Netlify Function.
</p>

<p>
Следующим шагом подключим к этому маршруту
реальную передачу видео в TikTok.
</p>

</body>
</html>
`
    };
  }


  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };

};
