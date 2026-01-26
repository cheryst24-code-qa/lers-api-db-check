// checks/measure-points.js
const sql = require('mssql');

async function checkMeasurePoints(apiToken, baseUrl) {
  console.log('📡 Запрос /Core/MeasurePoints...');

  // === 1. Получение данных из API ===
  const res = await fetch(`${baseUrl}/api/v1/Core/MeasurePoints`, {
    headers: { Authorization: `Bearer ${apiToken}` }
  });

  if (!res.ok) {
    throw new Error(`Ошибка API MeasurePoints: ${res.status} ${await res.text()}`);
  }

  const jsonResponse = await res.json();
  const apiData = Array.isArray(jsonResponse)
    ? jsonResponse
    : jsonResponse.data || jsonResponse.measurePoints || [];

  // === 2. Запрос к БД ===
  console.log('🗄️ Запрос к dbo.MeasurePoint...');
  const pool = await sql.connect(); // используем глобальное подключение
  const dbResult = await pool.request().query(`
    SELECT
      MeasurePoint_ID AS id,
      MeasurePoint_Title AS title,
      MeasurePoint_ServiceNumber AS serviceNumber,
      MeasurePoint_NodeID AS nodeId
    FROM dbo.MeasurePoint
  `);
  const dbData = dbResult.recordset;

  // === 3. Нормализация и сравнение ===
  console.log(`🔁 Сравнение: API (${apiData.length}) vs DB (${dbData.length})`);

  const normalize = (item) => ({
    id: item.id,
    title: item.title === "null" ? null : item.title,
    serviceNumber: item.serviceNumber === "null" ? null : item.serviceNumber,
    nodeId: item.nodeId // обычно число, не строка
  });

  const apiMap = new Map(apiData.map(normalize).map(x => [x.id, x]));
  const dbMap = new Map(dbData.map(x => [x.id, x]));

  const allIds = new Set([...apiMap.keys(), ...dbMap.keys()]);
  let hasMismatch = false;

  for (const id of allIds) {
    const api = apiMap.get(id);
    const db = dbMap.get(id);

    if (!api) {
      console.warn(`⚠️  ID=${id} есть в БД, но отсутствует в API`);
      hasMismatch = true;
      continue;
    }
    if (!db) {
      console.warn(`⚠️  ID=${id} есть в API, но отсутствует в БД`);
      hasMismatch = true;
      continue;
    }

    const fields = ['title', 'serviceNumber', 'nodeId'];
    for (const field of fields) {
      const apiVal = api[field];
      const dbVal = db[field];

      // Приведение к строке для сравнения (null → "null" не делаем!)
      const apiClean = apiVal == null ? null : String(apiVal);
      const dbClean = dbVal == null ? null : String(dbVal);

      if (apiClean !== dbClean) {
        console.warn(
          `❌ ID=${id}: поле "${field}" не совпадает.\n` +
          `   API: "${apiClean}"\n` +
          `   DB:  "${dbClean}"`
        );
        hasMismatch = true;
      }
    }
  }

  if (!hasMismatch) {
    console.log('✅ Все точки учёта совпадают!');
  } else {
    console.log('❗ Найдены расхождения в точках учёта.');
    process.exitCode = 1;
  }
}

module.exports = { checkMeasurePoints };