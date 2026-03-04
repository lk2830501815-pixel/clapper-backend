// src/routes/weeks.js — 周期管理
const router = require('express').Router();
const db = require('../db');

// GET /api/weeks — 获取所有周期
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM weeks ORDER BY start_date ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/weeks — 创建或获取周期（内部使用）
// 返回 week_id
async function ensureWeek(weekCode, startDate, endDate) {
  // 先查是否已存在
  const existing = await db.query(
    'SELECT week_id FROM weeks WHERE week_code = $1',
    [weekCode]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].week_id;
  }
  // 创建新周期
  const result = await db.query(
    'INSERT INTO weeks (week_code, start_date, end_date) VALUES ($1, $2, $3) RETURNING week_id',
    [weekCode, startDate, endDate]
  );
  return result.rows[0].week_id;
}

module.exports = router;
module.exports.ensureWeek = ensureWeek;
