// src/routes/streamer.js — 主播数据查询API
const router = require('express').Router();
const db = require('../db');

// GET /api/streamer/weekly?week=W5 — 某周所有主播数据
router.get('/weekly', async (req, res) => {
  try {
    const weekCode = req.query.week;
    let query, params;

    if (weekCode) {
      query = `
        SELECT sw.*, s.username, w.week_code, w.start_date, w.end_date
        FROM streamer_weekly sw
        JOIN streamers s ON sw.streamer_id = s.streamer_id
        JOIN weeks w ON sw.week_id = w.week_id
        WHERE w.week_code = $1
        ORDER BY sw.rank ASC NULLS LAST`;
      params = [weekCode];
    } else {
      // 默认返回最新一周
      query = `
        SELECT sw.*, s.username, w.week_code, w.start_date, w.end_date
        FROM streamer_weekly sw
        JOIN streamers s ON sw.streamer_id = s.streamer_id
        JOIN weeks w ON sw.week_id = w.week_id
        WHERE sw.week_id = (SELECT MAX(week_id) FROM streamer_weekly)
        ORDER BY sw.rank ASC NULLS LAST`;
      params = [];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streamer/trend?id=8677440 — 某主播全历史趋势
router.get('/trend', async (req, res) => {
  try {
    const streamerId = req.query.id;
    if (!streamerId) return res.status(400).json({ error: '缺少id参数' });

    const result = await db.query(`
      SELECT sw.*, w.week_code, w.start_date, w.end_date
      FROM streamer_weekly sw
      JOIN weeks w ON sw.week_id = w.week_id
      WHERE sw.streamer_id = $1
      ORDER BY w.start_date ASC`,
      [streamerId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streamer/all-trends — 所有主播所有周的数据（前端看板用）
router.get('/all-trends', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT sw.streamer_id, sw.total_revenue, sw.total_viewers, sw.paying_users,
             sw.payment_rate, sw.arppu, sw.arpu, sw.rank, sw.tier, sw.quadrant,
             sw.composite_score, sw.is_new_entrant, sw.is_unstable,
             sw.revenue_concentration, sw.funnel_diagnosis,
             sw.day1_revenue, sw.day2_revenue, sw.day3_revenue, sw.day4_revenue,
             sw.day5_revenue, sw.day6_revenue, sw.day7_revenue,
             s.username, w.week_code, w.start_date
      FROM streamer_weekly sw
      JOIN streamers s ON sw.streamer_id = s.streamer_id
      JOIN weeks w ON sw.week_id = w.week_id
      ORDER BY w.start_date ASC, sw.rank ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streamer/list — 主播列表
router.get('/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM streamers WHERE is_active = TRUE ORDER BY username'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
