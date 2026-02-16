// index.js
require("dotenv").config();

// Отладка
// console.log(' API_LOGIN:', process.env.API_LOGIN);
// console.log(' API_PASSWORD (первые 4 символа):', process.env.API_PASSWORD?.substring(0, 4) || 'null');

const fs = require("fs");
const path = require("path");
const fetch = globalThis.fetch || require("node-fetch");

const { initDbConnection } = require("./api-db-checks/lib/db");
const { checkNodes } = require("./api-db-checks/test-data/nodes");
const { checkMeasurePoints } = require("./api-db-checks/test-data/measure-points");
const { checkEquipment } = require("./api-db-checks/test-data/equipment");

// === Логирование и сбор отчёта ===
let reportLogs = [];
let hasErrors = false;

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  reportLogs.push({ message: message || "" });
  if (message && (message.includes("❎") || message.includes("❌"))) {
    hasErrors = true;
  }
}

// === Основная функция ===
async function main() {
  try {
    // 1. Авторизация
    log("☑️  Авторизация в API...");
    const loginRes = await fetch(`${process.env.API_BASE_URL}/api/v1/Login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: process.env.API_LOGIN,
        password: process.env.API_PASSWORD,
      }),
    });

    if (!loginRes.ok) {
      throw new Error(`Ошибка входа: ${loginRes.status}`);
    }
    const { token } = await loginRes.json();
    log("☑️  Токен получен.");

    // 2. Подключение к БД (только если не mock)
    if (process.env.MOCK_DB !== "true") {
      await initDbConnection();
    }

    // 3. Запуск проверок
    await checkNodes(token, process.env.API_BASE_URL, log);
    await checkMeasurePoints(token, process.env.API_BASE_URL, log);
    await checkEquipment(token, process.env.API_BASE_URL, log);

    log("✔️  Все проверки завершены.");
  } catch (err) {
    log(`❗  Необработанная ошибка: ${err.message}`);
  }

  // 4. Генерация HTML-отчёта
  const now = new Date().toLocaleString("ru-RU");
  const status = hasErrors
    ? "❌  Обнаружены расхождения"
    : "✔️  Все проверки пройдены";
  const statusClass = hasErrors ? "error" : "success";

  let html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Отчет о сверке API и БД системы ЛЭРС</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f9f9f9; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; text-align: center; }
    .status { text-align: center; font-size: 18px; margin: 20px 0; }
    .success { color: #27ae60; }
    .error { color: #e74c3c; }
    .log { background: #f5f5f5; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 20px; }
    .log-line { margin: 4px 0; }
    .log-error { color: #e74c3c; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Отчет о сверке API и БД системы ЛЭРС</h1>
    <div class="status"><strong>Статус:</strong> <span class="${statusClass}">${status}</span></div>
    <p><strong>Дата и время:</strong> ${now}</p>
    <div class="log">`;

  for (const { message } of reportLogs) {
    const msg = message || " ";
    const isError = msg.includes("❗") || msg.includes("❌");
    const cls = isError ? "log-error" : "";
    html += `<div class="log-line ${cls}">${msg}</div>\n`;
  }

  html += `
    </div>
  </div>
</body>
</html>`;

  // Сохраняем отчёт
  const reportDir = "reports";
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, "api-db-check-report.html");
  fs.writeFileSync(reportPath, html);
  console.log(`☑️  HTML-отчёт сохранён: ${reportPath}`);

  // Открываем отчёт ТОЛЬКО при локальном запуске (не в CI)
  if (!process.env.CI) {
    const { default: open } = require("open");
    open(reportPath);
  }
}

// === ЗАПУСК СКРИПТА ===
main().catch((err) => {
  console.error("❗  Критическая ошибка:", err.message);
  process.exit(1);
});
