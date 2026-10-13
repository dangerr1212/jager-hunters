import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const sqlite = sqlite3.verbose();
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// Подключаем базу данных SQLite
const db = new sqlite.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных', err.message);
  } else {
    console.log('Успешное подключение к базе данных SQLite.');
  }
});

// Создаем таблицу пользователей
db.run(`CREATE TABLE IF NOT EXISTS users (
  telegram_id TEXT PRIMARY KEY,
  username TEXT,
  character TEXT,
  level INTEGER DEFAULT 1
)`, (err) => {
  if (!err) {
    console.log('Таблица пользователей готова.');
  }
});

// Маршрут для сохранения выбора персонажа
app.post('/api/select-character', (req, res) => {
  const { telegram_id, username, character } = req.body;

  if (!telegram_id || !character) {
    return res.status(400).json({ error: 'Не хватает данных' });
  }

  const query = `INSERT INTO users (telegram_id, username, character) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(telegram_id) 
                 DO UPDATE SET character = ?`;

  db.run(query, [telegram_id, username, character, character], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Персонаж успешно сохранен!' });
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});