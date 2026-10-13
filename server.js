import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const sqlite = sqlite3.verbose();
const app = express();
app.use(express.json());
app.use(cors());

const db = new sqlite.Database('./jager.db', (err) => {
  if (err) console.error('Ошибка подключения к SQLite:', err.message);
  else console.log('База данных SQLite успешно подключена.');
});

// Добавлены колонки reward и last_scan_time
db.run(`CREATE TABLE IF NOT EXISTS users (
  telegram_id TEXT PRIMARY KEY,
  username TEXT,
  character TEXT,
  completed_bars TEXT DEFAULT '[]',
  reward TEXT,
  last_scan_time INTEGER DEFAULT 0
)`);

app.post('/api/select-character', (req, res) => {
  const { telegram_id, username, character } = req.body;
  db.run(
    `INSERT INTO users (telegram_id, username, character) VALUES (?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET character = ?`,
    [telegram_id, username, character, character],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/complete-bar', (req, res) => {
  const { telegram_id, bar_id } = req.body;
  const now = Date.now();
  const COOLDOWN_MS = 30 * 60 * 1000; // 30 минут

  db.get(`SELECT completed_bars, last_scan_time FROM users WHERE telegram_id = ?`, [telegram_id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(400).json({ success: false, error: 'Игрок не найден' });

    // Проверка серверного кулдауна
    if (now - (row.last_scan_time || 0) < COOLDOWN_MS) {
      return res.status(429).json({ success: false, error: 'Кулдаун еще не прошел' });
    }

    let bars = [];
    try { bars = JSON.parse(row.completed_bars || '[]'); } catch (e) {}

    if (!bars.includes(bar_id)) bars.push(bar_id);

    db.run(
      `UPDATE users SET completed_bars = ?, last_scan_time = ? WHERE telegram_id = ?`,
      [JSON.stringify(bars), now, telegram_id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });
        res.json({ success: true, completed_bars: bars });
      }
    );
  });
});

// Эндпоинт сохранения выбранного приза
app.post('/api/select-reward', (req, res) => {
  const { telegram_id, reward } = req.body;
  db.run(
    `UPDATE users SET reward = ? WHERE telegram_id = ?`,
    [reward, telegram_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.get('/api/user/:telegram_id', (req, res) => {
  const { telegram_id } = req.params;
  db.get(`SELECT character, completed_bars, reward FROM users WHERE telegram_id = ?`, [telegram_id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.json({ success: true, user: null });

    let bars = [];
    try { bars = JSON.parse(row.completed_bars || '[]'); } catch (e) {}

    res.json({
      success: true,
      user: { character: row.character, completed_bars: bars, reward: row.reward }
    });
  });
});

app.listen(5000, () => {
  console.log('Сервер запущен на порту 5000');
});