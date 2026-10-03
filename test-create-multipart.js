const http = require('http');

// 1. Log in to get authorization token
const loginData = JSON.stringify({
  email: 'test765@myarea.com',
  password: 'password123'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, (res) => {
  let loginBody = '';
  res.on('data', (chunk) => loginBody += chunk);
  res.on('end', () => {
    const loginPayload = JSON.parse(loginBody);
    const token = loginPayload.token;
    if (!token) {
      console.error('[Test Multipart] Failed to login:', loginPayload.message);
      process.exit(1);
    }

    // 2. Fetch categories to get a valid UUID
    http.get('http://localhost:5000/api/categories', (catRes) => {
      let catBody = '';
      catRes.on('data', (chunk) => catBody += chunk);
      catRes.on('end', () => {
        const catPayload = JSON.parse(catBody);
        const categoryId = catPayload.categories[0].id;

        // 3. Construct raw multipart body
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const parts = [
          { name: 'title', value: 'Water leak in Lobby' },
          { name: 'description', value: 'There is a major pipe leak in the main lobby entrance.' },
          { name: 'categoryId', value: categoryId },
          { name: 'priority', value: 'high' },
          { name: 'block', value: 'B' },
          { name: 'houseNumber', value: '204' },
          { name: 'floor', value: '2' },
          { name: 'contactNumber', value: '9876543210' }
        ];

        let multipartBody = '';
        for (const part of parts) {
          multipartBody += `--${boundary}\r\n`;
          multipartBody += `Content-Disposition: form-data; name="${part.name}"\r\n\r\n`;
          multipartBody += `${part.value}\r\n`;
        }
        multipartBody += `--${boundary}--\r\n`;

        // 4. Send request
        const postReq = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/complaints',
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(multipartBody),
            'Authorization': `Bearer ${token}`
          }
        }, (postRes) => {
          let postBody = '';
          postRes.on('data', (chunk) => postBody += chunk);
          postRes.on('end', () => {
            console.log('[Test Multipart] Status Code:', postRes.statusCode);
            console.log('[Test Multipart] Response:', postBody);
            process.exit(0);
          });
        });

        postReq.on('error', (err) => {
          console.error('[Test Multipart] Request Error:', err.message);
          process.exit(1);
        });

        postReq.write(multipartBody);
        postReq.end();
      });
    });
  });
});

req.on('error', (err) => {
  console.error('[Test Multipart] Login HTTP Error:', err.message);
  process.exit(1);
});

req.write(loginData);
req.end();
