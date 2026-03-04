// src/routes/whale.js — 大R数据查询API
const router = require('express').Router();
const db = require('../db');

// GET /api/whale/weekly?week=W5
router.get('/weekly', async (req, res) => {
  try {
    const weekCode = req.query.week;
    let query, params;

    if (weekCode) {
      query = `
        SELECT ww.*, wh.username, w.week_code, w.start_date, w.end_date
        FROM whale_weekly ww
        JOIN whales wh ON ww.whale_id = wh.whale_id
        JOIN weeks w ON ww.week_id = w.week_id
        WHERE w.week_code = $1
        ORDER BY ww.rank ASC NULLS LAST`;
      params = [weekCode];
    } else {
      query = `
        SELECT ww.*, wh.username, w.week_code, w.start_date, w.end_date
        FROM whale_weekly ww
        JOIN whales wh ON ww.whale_id = wh.whale_id
        JOIN weeks w ON ww.week_id = w.week_id
        WHERE ww.week_id = (SELECT MAX(week_id) FROM whale_weekly)
        ORDER BY ww.rank ASC NULLS LAST`;
      params = [];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whale/trend?id=12345
router.get('/trend', async (req, res) => {
  try {
    const whaleId = req.query.id;
    if (!whaleId) return res.status(400).json({ error: '缺少id参数' });

    const result = await db.query(`
      SELECT ww.*, w.week_code, w.start_date, w.end_date
      FROM whale_weekly ww
      JOIN weeks w ON ww.week_id = w.week_id
      WHERE ww.whale_id = $1
      ORDER BY w.start_date ASC`,
      [whaleId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whale/all-trends — 全部大R全部周数据
router.get('/all-trends', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ww.whale_id, ww.total_recharge, ww.total_spending, ww.coin_balance,
             ww.gift_count, ww.gifted_streamers, ww.behavior_type,
             ww.health_score, ww.risk_score, ww.risk_level,
             ww.rank, ww.is_declining, ww.churn_probability,
             wh.username, w.week_code, w.start_date
      FROM whale_weekly ww
      JOIN whales wh ON ww.whale_id = wh.whale_id
      JOIN weeks w ON ww.week_id = w.week_id
      ORDER BY w.start_date ASC, ww.rank ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whale/gifts?week=W5&whale_id=12345
router.get('/gifts', async (req, res) => {
  try {
    const { week, whale_id } = req.query;
    let query = `
      SELECT wsg.*, s.username AS streamer_name, w.week_code
      FROM whale_streamer_gifts wsg
      JOIN streamers s ON wsg.streamer_id = s.streamer_id
      JOIN weeks w ON wsg.week_id = w.week_id`;
    const conditions = [];
    const params = [];

    if (week) { conditions.push(`w.week_code = $${params.length+1}`); params.push(week); }
    if (whale_id) { conditions.push(`wsg.whale_id = $${params.length+1}`); params.push(whale_id); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY wsg.gift_amount DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whale/list
router.get('/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM whales WHERE is_active = TRUE ORDER BY username'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
