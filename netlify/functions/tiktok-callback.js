exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  if (params.error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: `<h1>TikTok authorization error</h1><p>${params.error}</p>`
    };
  }

  if (!params.code) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      body: "<h1>TikTok OAuth callback is ready</h1><p>Authorization code was not provided.</p>"
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
    body: "<h1>TikTok authorization received</h1><p>The OAuth callback is working.</p>"
  };
};
