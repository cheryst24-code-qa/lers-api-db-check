# LERS API ↔ DB Consistency Validator

Автоматизированный скрипт для проверки согласованности данных между REST API системы **ЛЭРС УЧЁТ** и базой данных **MS SQL Server**.
Проверяет соответствие трёх ключевых сущностей:

- Объекты учёта (`/Core/Nodes` ↔ `dbo.Node`)
- Точки учёта (`/Core/MeasurePoints` ↔ `dbo.MeasurePoint`)
- Оборудование (`/Core/Equipment` ↔ `dbo.Equipment`)

## 💡 Возможности

- Авторизация в API
- Сравнение полей с учётом различий в именовании (`Name` ↔ `title`)
- Нормализация `"null"` → `null`
- Учёт прав доступа пользователя
- Чёткий отчёт о расхождениях

## 🛠️ Требования

- Node.js v18+
- Доступ к ЛЭРС API
- Доступ к MS SQL Server (БД `LERS`)

## ⚙️ Настройка

✅ Шаг 1. Установите зависимости:

```bash
   npm install
```

✅ Шаг 2. Создайте файл `.env`

⚠️ Никогда не коммить .env в Git!

Скопируйте шаблон:

```bash
    cp .env.example .env
```
и заполните своими значениями.

📄 Пример .env.example

```env
   # Пример файла конфигурации
   # Скопировать в .env и заполнить своими значениями

   DB_SERVER=localhost\\SQLEXPRESS
   DB_DATABASE=LERS
   DB_USER=qa_reader
   DB_PASSWORD=your_db_password

   API_BASE_URL=http://localhost:8080
   API_LOGIN=test
   API_PASSWORD=your_api_password
```

✅ Шаг 3. ▶️ Запуск

```bash
   node index.js
```
    📂 Структура проекта

    lers-api-db-check/
    ├── index.js # точка входа
    ├── lib/db.js # подключение к БД
    ├── checks/ # модули проверок
    │ ├── nodes.js
    │ ├── measure-points.js
    │ └── equipment.js
    └── .env.example # шаблон переменных

✅ Шаг 4. Обновите .gitignore
Убедитесь, что в .gitignore есть:

```gitignore
    .env
    node_modules/
    npm-debug.log*
```

✅ Шаг 5. 📄 Лицензия

Этот проект распространяется под лицензией MIT. Подробнее см. в файле [LICENSE](LICENSE).

✅ Шаг 6. Инициализируйте Git:

```bash
git init
git add .
git commit -m "feat: initial commit of LERS API-DB validator"
```

🌐 Шаг 7. Выложите на GitHub

1. Создайте новый репозиторий на GitHub (без README!).
2. Выполните:

```bash
git remote add origin https://github.com/ваш-ник/lеrs-api-db-check.git
git branch -M main
git push -u origin main
```

## 🖥️ Пример выполнения

![Успешный запуск скрипта](docs/success-run.png)

Скрипт выполняет сравнение всех сущностей и завершается с кодом 0 при отсутствии расхождений.
