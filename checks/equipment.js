// checks/equipment.js
const sql = require("mssql");

async function checkEquipment(apiToken, baseUrl, log = console.log) {
  log("\u2713 Запрос /Core/Equipment...");

  // Получение данных из API
  const res = await fetch(`${baseUrl}/api/v1/Core/Equipment`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  let apiData = await res.json();

  // Извлекаем массив из поля "list"
  let equipmentList = [];
  if (apiData && Array.isArray(apiData.list)) {
    equipmentList = apiData.list;
  } else {
    log('\u2757 Поле "list" отсутствует или не является массивом. Используем пустой список.');
  }

  // === 2. Получение данных из БД или mock ===
  let dbData;
  if (process.env.MOCK_DB === 'true') {
    log('\u2713 MOCK: данные БД из fixtures');
    dbData = require('../fixtures/db-equipment.json');
  } else {
    log("\u2713 Запрос к dbo.Equipment...");
    const dbRes = await sql.query(`
      SELECT
        Id AS id,
        SerialNumber AS serialNumber,
        Comment AS comment,
        EquipmentModelId AS equipmentModelId
      FROM dbo.Equipment
    `);
    dbData = dbRes.recordset;
  }

  log(`\u2713 Сравнение: API (${equipmentList.length}) vs DB (${dbData.length})`);

  // Нормализация
  const normalize = (item) => {
    if (!item || typeof item !== "object") return null;
    return {
      id: item.id,
      serialNumber: item.serialNumber === "null" ? null : item.serialNumber,
      comment: item.comment === "null" ? null : item.comment,
      equipmentModelId: item.equipmentModelId,
    };
  };

  const apiClean = equipmentList
    .map(normalize)
    .filter((x) => x && x.id != null);
  const apiMap = new Map(apiClean.map((x) => [x.id, x]));
  const dbMap = new Map(dbData.map((x) => [x.id, x]));

  const allIds = new Set([...apiMap.keys(), ...dbMap.keys()]);
  let hasMismatch = false;

  for (const id of allIds) {
    const api = apiMap.get(id);
    const db = dbMap.get(id);

    if (!api) {
      log(`\u2757 ID=${id} есть в БД, но отсутствует в API`);
      hasMismatch = true;
      continue;
    }
    if (!db) {
      log(`\u2757 ID=${id} есть в API, но отсутствует в БД`);
      hasMismatch = true;
      continue;
    }

    const fields = ["serialNumber", "comment", "equipmentModelId"];
    for (const f of fields) {
      const a = api[f] == null ? null : String(api[f]);
      const d = db[f] == null ? null : String(db[f]);
      if (a !== d) {
        log(`\u2717 ID=${id}: поле "${f}" не совпадает. API="${a}", DB="${d}"`);
        hasMismatch = true;
      }
    }
  }

  if (!hasMismatch) {
    log("\u2713 Всё оборудование совпадает!");
  } else {
    log("\u2757 Найдены расхождения в оборудовании.");
    process.exitCode = 1;
  }
}

module.exports = { checkEquipment };