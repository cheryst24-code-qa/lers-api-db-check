// checks/nodes.js
const sql = require('mssql');

async function checkNodes(apiToken, baseUrl, log = console.log) {
  // === 1. Получение Nodes из API ===
  log('✔️  Запрос /Core/Nodes...');
  const nodesRes = await fetch(`${baseUrl}/api/v1/Core/Nodes`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!nodesRes.ok) {
    throw new Error(`Ошибка API: ${nodesRes.status} ${await nodesRes.text()}`);
  }
  const jsonResponse = await nodesRes.json();
  const apiNodes = Array.isArray(jsonResponse)
    ? jsonResponse
    : jsonResponse.data || jsonResponse.nodes || [];

  // === 2. Получение данных из БД или mock ===
  let dbData;
  if (process.env.MOCK_DB === 'true') {
    log('✔️  Режим: МОСК для БД');
    dbData = require('../fixtures/db-nodes.json');
  } else {
    log('✔️  Запрос к db.Node...');
    const pool = await sql.connect();
    const result = await pool.request().query(`
      SELECT ID, Title AS Name, Comment, Address,TerritoryId
      FROM dbo.Node
      `);
    dbData = result.recordset;
  }

  // === 3. Сравнение ===
  log(`✔️  Сравнение: API (${apiNodes.length}) vs DB (${dbData.length})`);

  const normalizedApiNodes = apiNodes.map(node => ({
    id: node.id,
    name: node.title === "null" ? null : node.title,
    comment: node.comment === "null" ? null : node.comment,
    address: node.address === "null" ? null : node.address,
    territoryId: node.territoryId
  }));

  const apiMap = new Map(normalizedApiNodes.map(n => [n.id, n]));
  const dbMap = new Map(dbData.map(n => [n.ID, n]));

  const allIds = new Set([...apiMap.keys(), ...dbMap.keys()]);
  let hasMismatch = false;

  for (const id of allIds) {
    const api = apiMap.get(id);
    const db = dbMap.get(id);

    if (!api) {
      log(`❗ ID=${id} есть в БД, но отсутствует в API`);
      hasMismatch = true;
      continue;
    }
    if (!db) {
      log(`❗ ID=${id} есть в API, но отсутствует в БД`);
      hasMismatch = true;
      continue;
    }

    const fields = [
      { key: 'name', apiField: 'name', dbField: 'Name' },
      { key: 'comment', apiField: 'comment', dbField: 'Comment' },
      { key: 'address', apiField: 'address', dbField: 'Address' },
      { key: 'territoryId', apiField: 'territoryId', dbField: 'TerritoryId' }
    ];

    for (const f of fields) {
      const a = api[f.apiField] == null ? null : String(api[f.apiField]);
      const d = db[f.dbField] == null ? null : String(db[f.dbField]);
      if (a !== d) {
        log(
          `✔️  ID=${id}: поле "${f.key}" не совпадает.\n` +
          `   API: "${a}"\n` +
          `   DB:  "${d}"`
        );
        hasMismatch = true;
      }
    }
  }

  if (!hasMismatch) {
    log('✔️  Все данные объектов учета совпадают!');
  } else {
    log('❗ Найдены расхождения данных в объектах учета.');
    process.exitCode = 1;
  }
}

module.exports = { checkNodes };