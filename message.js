// src/routes/message.js — 消息分析数据查询API
const router = require('express').Router();
const db = require('./db');

// GET /api/message/weekly?week=W5
router.get('/weekly', async (req, res) => {
  try {
    const weekCode = req.query.week;
    let query, params;

    if (weekCode) {
      query = `
        SELECT mw.*, s.username, w.week_code, w.start_date, w.end_date
        FROM message_weekly mw
        JOIN streamers s ON mw.streamer_id = s.streamer_id
        JOIN weeks w ON mw.week_id = w.week_id
        WHERE w.week_code = $1
        ORDER BY mw.valuable_messages DESC`;
      params = [weekCode];
    } else {
      query = `
        SELECT mw.*, s.username, w.week_code, w.start_date, w.end_date
        FROM message_weekly mw
        JOIN streamers s ON mw.streamer_id = s.streamer_id
        JOIN weeks w ON mw.week_id = w.week_id
        WHERE mw.week_id = (SELECT MAX(week_id) FROM message_weekly)
        ORDER BY mw.valuable_messages DESC`;
      params = [];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/message/trend — 全部主播全部周的消息趋势
router.get('/trend', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT mw.streamer_id, mw.total_messages, mw.valuable_messages, mw.conversation_count,
             mw.cat_daily_chat, mw.cat_relationship, mw.cat_content_delivery,
             mw.cat_pricing, mw.cat_external_redirect, mw.cat_complaint,
             mw.cat_platform_issue, mw.cat_dnd,
             mw.has_snapchat, mw.has_fambase, mw.has_onlyfans, mw.has_paypal, mw.has_dropbox,
             s.username, w.week_code, w.start_date
      FROM message_weekly mw
      JOIN streamers s ON mw.streamer_id = s.streamer_id
      JOIN weeks w ON mw.week_id = w.week_id
      ORDER BY w.start_date ASC, mw.valuable_messages DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/message/excerpts?week=W5&streamer=8677440
router.get('/excerpts', async (req, res) => {
  try {
    const { week, streamer } = req.query;
    let query = `
      SELECT mke.*, s.username, w.week_code
      FROM message_key_excerpts mke
      JOIN streamers s ON mke.streamer_id = s.streamer_id
      JOIN weeks w ON mke.week_id = w.week_id`;
    const conditions = [];
    const params = [];

    if (week) { conditions.push(`w.week_code = $${params.length+1}`); params.push(week); }
    if (streamer) { conditions.push(`mke.streamer_id = $${params.length+1}`); params.push(streamer); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY mke.importance DESC, mke.message_time ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/message/raw?week=W5&streamer=8677440&limit=100
router.get('/raw', async (req, res) => {
  try {
    const { week, streamer, limit = 200 } = req.query;
    let query = `
      SELECT mr.*, s.username, w.week_code
      FROM messages_raw mr
      JOIN streamers s ON mr.streamer_id = s.streamer_id
      JOIN weeks w ON mr.week_id = w.week_id`;
    const conditions = [];
    const params = [];

    if (week) { conditions.push(`w.week_code = $${params.length+1}`); params.push(week); }
    if (streamer) { conditions.push(`mr.streamer_id = $${params.length+1}`); params.push(streamer); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY mr.created_at DESC LIMIT $${params.length+1}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
