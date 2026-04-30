const url = process.env.API_URL ?? 'http://10.242.102.211:3000/api/auth/signup';

const body = {
  name: 'Test Node',
  email: `test${Date.now()}@example.com`,
  password: 'password123',
};

const run = async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (error) {
    console.error('Request failed:', error);
  }
};

run();

