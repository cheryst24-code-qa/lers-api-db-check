// index.js
require('dotenv').config();
const { initDbConnection } = require('./lib/db');
const { checkNodes } = require('./checks/nodes');
const { checkMeasurePoints } = require('./checks/measure-points');
const { checkEquipment } = require('./checks/equipment');

async function main() {
  // 1. Авторизация
  console.log('🔐 Авторизация в API...');
  const loginRes = await fetch(`${process.env.API_BASE_URL}/api/v1/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: process.env.API_LOGIN,
      password: process.env.API_PASSWORD
    })
  });
  if (!loginRes.ok) throw new Error('Не удалось войти в API');
  const { token } = await loginRes.json();
  console.log('✅ Токен получен.');

  // 2. Подключение к БД (глобальное)
  await initDbConnection();

  // 3. Запуск проверок
  await checkNodes(token, process.env.API_BASE_URL);
  await checkMeasurePoints(token, process.env.API_BASE_URL);
  await checkEquipment(token, process.env.API_BASE_URL);

  console.log('\n🏁 Все проверки завершены.');
}

main().catch(err => {
  console.error('💥 Ошибка:', err.message);
  process.exit(1);
});