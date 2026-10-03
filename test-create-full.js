const http = require('http');

const requestJSON = (options, payload) => {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const reqOptions = {
      hostname: 'localhost',
      port: 5000,
      path: options.path,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    if (data) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
};

const main = async () => {
  try {
    const email = `test_res_${Math.floor(Math.random() * 10000)}@myarea.com`;
    const password = 'password123';

    // 1. Register Resident
    console.log('[Step 1] Registering fresh resident...');
    const registerRes = await requestJSON({ path: '/api/auth/register' }, {
      email,
      password,
      name: 'Diagnostic Resident',
      block: 'B',
      houseNumber: '204',
      phone: '9876543210',
      role: 'resident'
    });
    console.log('Register response status:', registerRes.statusCode);

    const token = registerRes.body.token;
    if (!token) {
      console.error('Registration failed:', registerRes.body);
      process.exit(1);
    }

    // 2. Fetch categories
    console.log('[Step 2] Fetching categories...');
    const catRes = await requestJSON({ path: '/api/categories', method: 'GET' });
    const categoryId = catRes.body.categories[0].id;
    console.log('Fetched Category ID:', categoryId);

    // 3. Post multipart complaint
    console.log('[Step 3] Filing multipart complaint...');
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const parts = [
      { name: 'title', value: 'Leakage in Block B lobby' },
      { name: 'description', value: 'There is a major pipe leak in the Block B lobby area causing water clogging.' },
      { name: 'categoryId', value: categoryId },
      { name: 'priority', value: 'high' },
      { name: 'block', value: 'B' },
      { name: 'houseNumber', value: '204' },
      { name: 'floor', value: '0' },
      { name: 'contactNumber', value: '9876543210' }
    ];

    let multipartBody = '';
    for (const part of parts) {
      multipartBody += `--${boundary}\r\n`;
      multipartBody += `Content-Disposition: form-data; name="${part.name}"\r\n\r\n`;
      multipartBody += `${part.value}\r\n`;
    }
    multipartBody += `--${boundary}--\r\n`;

    const postReqOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/complaints',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(multipartBody),
        'Authorization': `Bearer ${token}`
      }
    };

    const postRes = await new Promise((resolve, reject) => {
      const req = http.request(postReqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', (err) => reject(err));
      req.write(multipartBody);
      req.end();
    });

    console.log('Complaint Post status:', postRes.statusCode);
    console.log('Complaint Post response:', postRes.body);
    process.exit(0);
  } catch (error) {
    console.error('Diagnostic error:', error);
    process.exit(1);
  }
};

main();
