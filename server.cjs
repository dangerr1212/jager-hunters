const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Инициализация базы данных SQLite
const dbFile = path.join(__dirname, 'server', 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к базе данных SQLite.');
  }
});

// Создаем таблицы, если их еще нет
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    username TEXT,
    character TEXT,
    reward TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_bars (
    telegram_id TEXT,
    bar_id INTEGER,
    PRIMARY KEY (telegram_id, bar_id)
  )`);
});

// --- API МАРШРУТЫ ---

// Получить данные пользователя (персонаж, прогресс баров, приз)
app.get('/api/user/:telegramId', (req, res) => {
  const { telegramId } = req.params;

  db.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegramId], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    db.all(`SELECT bar_id FROM user_bars WHERE telegram_id = ?`, [telegramId], (err, bars) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({
        success: true,
        user: user ? {
          character: user.character,
          reward: user.reward,
          completed_bars: bars.map(b => b.bar_id)
        } : null
      });
    });
  });
});

// Выбор персонажа
app.post('/api/select-character', (req, res) => {
  const { telegram_id, username, character } = req.body;

  db.run(
    `INSERT INTO users (telegram_id, username, character) VALUES (?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET character = ?`,
    [telegram_id, username, character, character],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Отметка о прохождении бара (сканирование QR)
app.post('/api/complete-bar', (req, res) => {
  const { telegram_id, bar_id } = req.body;

  db.run(
    `INSERT OR IGNORE INTO user_bars (telegram_id, bar_id) VALUES (?, ?)`,
    [telegram_id, bar_id],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Выбор финальной награды
app.post('/api/select-reward', (req, res) => {
  const { telegram_id, reward } = req.body;

  db.run(
    `UPDATE users SET reward = ? WHERE telegram_id = ?`,
    [reward, telegram_id],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// --- РАЗДАЧА ФРОНТЕНДА (React / Vite) ---
// Раздаем статические файлы из папки сборки dist
app.use(express.static(path.join(__dirname, 'dist')));

// Все остальные запросы перенаправляем на index.html, чтобы работал роутинг React
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});