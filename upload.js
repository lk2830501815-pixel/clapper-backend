// src/routes/upload.js — Excel上传解析入库
const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');
const { ensureWeek } = require('./weeks');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/upload/streamer
router.post('/streamer', upload.single('file'), async (req, res) => {
  try {
    const { week_code, start_date, end_date } = req.body;
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    if (!week_code || !start_date || !end_date) return res.status(400).json({ error: '缺少周期信息' });

    const weekId = await ensureWeek(week_code, start_date, end_date);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (rows.length === 0) return res.status(400).json({ error: 'Excel为空' });

    console.log('Streamer upload:', rows.length, 'rows, columns:', Object.keys(rows[0]));
    let inserted = 0;

    for (const row of rows) {
      const sid = row['streamer_id'] || row['主播ID'] || row['ID'] || row['id'];
      const name = row['username'] || row['用户名'] || row['主播名'] || row['name'] || '';
      if (!sid) continue;

      await db.query(
        `INSERT INTO streamers (streamer_id, username, first_seen_week) VALUES ($1,$2,$3)
         ON CONFLICT (streamer_id) DO UPDATE SET username = EXCLUDED.username`,
        [sid, name, weekId]
      );

      await db.query(
        `INSERT INTO streamer_weekly 
         (week_id,streamer_id,rank,prev_rank,tier,total_revenue,
          day1_revenue,day2_revenue,day3_revenue,day4_revenue,day5_revenue,day6_revenue,day7_revenue,
          total_viewers,paying_users,payment_rate,arppu,arpu,
          quadrant,composite_score,is_new_entrant,is_unstable,revenue_concentration,funnel_diagnosis)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (week_id,streamer_id) DO UPDATE SET
          rank=EXCLUDED.rank,prev_rank=EXCLUDED.prev_rank,tier=EXCLUDED.tier,
          total_revenue=EXCLUDED.total_revenue,
          day1_revenue=EXCLUDED.day1_revenue,day2_revenue=EXCLUDED.day2_revenue,
          day3_revenue=EXCLUDED.day3_revenue,day4_revenue=EXCLUDED.day4_revenue,
          day5_revenue=EXCLUDED.day5_revenue,day6_revenue=EXCLUDED.day6_revenue,
          day7_revenue=EXCLUDED.day7_revenue,
          total_viewers=EXCLUDED.total_viewers,paying_users=EXCLUDED.paying_users,
          payment_rate=EXCLUDED.payment_rate,arppu=EXCLUDED.arppu,arpu=EXCLUDED.arpu,
          quadrant=EXCLUDED.quadrant,composite_score=EXCLUDED.composite_score,
          is_new_entrant=EXCLUDED.is_new_entrant,is_unstable=EXCLUDED.is_unstable,
          revenue_concentration=EXCLUDED.revenue_concentration,funnel_diagnosis=EXCLUDED.funnel_diagnosis`,
        [weekId, sid,
          num(row['rank']||row['排名']), num(row['prev_rank']||row['上周排名']),
          row['tier']||row['档位']||null, num(row['total_revenue']||row['总收入']||row['revenue']),
          num(row['day1']||row['day1_revenue']||row['周一']),
          num(row['day2']||row['day2_revenue']||row['周二']),
          num(row['day3']||row['day3_revenue']||row['周三']),
          num(row['day4']||row['day4_revenue']||row['周四']),
          num(row['day5']||row['day5_revenue']||row['周五']),
          num(row['day6']||row['day6_revenue']||row['周六']),
          num(row['day7']||row['day7_revenue']||row['周日']),
          num(row['total_viewers']||row['观众数']||row['viewers']),
          num(row['paying_users']||row['付费用户']||row['payers']),
          num(row['payment_rate']||row['付费率']),
          num(row['arppu']||row['ARPPU']), num(row['arpu']||row['ARPU']),
          row['quadrant']||row['象限']||null,
          num(row['composite_score']||row['综合评分']||row['score']),
          toBool(row['is_new_entrant']||row['新入榜']),
          toBool(row['is_unstable']||row['不稳定']),
          num(row['revenue_concentration']||row['收入集中度']),
          row['funnel_diagnosis']||row['漏斗诊断']||null
        ]
      );
      inserted++;
    }
    res.json({ success: true, message: `${week_code} 主播数据: ${inserted}条` });
  } catch (err) {
    console.error('Streamer upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/whale
router.post('/whale', upload.single('file'), async (req, res) => {
  try {
    const { week_code, start_date, end_date } = req.body;
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    if (!week_code || !start_date || !end_date) return res.status(400).json({ error: '缺少周期信息' });

    const weekId = await ensureWeek(week_code, start_date, end_date);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (rows.length === 0) return res.status(400).json({ error: 'Excel为空' });

    console.log('Whale upload:', rows.length, 'rows, columns:', Object.keys(rows[0]));
    let inserted = 0;

    for (const row of rows) {
      const wid = row['whale_id']||row['用户ID']||row['ID']||row['id']||row['user_id'];
      const name = row['username']||row['用户名']||row['name']||'';
      if (!wid) continue;

      await db.query(
        `INSERT INTO whales (whale_id, username, first_seen_week) VALUES ($1,$2,$3)
         ON CONFLICT (whale_id) DO UPDATE SET username = EXCLUDED.username`,
        [wid, name, weekId]
      );

      await db.query(
        `INSERT INTO whale_weekly
         (week_id,whale_id,rank,prev_rank,total_recharge,total_spending,
          coin_balance,gift_count,gifted_streamers,top_streamer_id,top_streamer_pct,
          behavior_type,health_score,risk_score,risk_level,
          days_since_last_recharge,recharge_frequency,is_declining,churn_probability)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (week_id,whale_id) DO UPDATE SET
          rank=EXCLUDED.rank,prev_rank=EXCLUDED.prev_rank,
          total_recharge=EXCLUDED.total_recharge,total_spending=EXCLUDED.total_spending,
          coin_balance=EXCLUDED.coin_balance,gift_count=EXCLUDED.gift_count,
          gifted_streamers=EXCLUDED.gifted_streamers,
          top_streamer_id=EXCLUDED.top_streamer_id,top_streamer_pct=EXCLUDED.top_streamer_pct,
          behavior_type=EXCLUDED.behavior_type,health_score=EXCLUDED.health_score,
          risk_score=EXCLUDED.risk_score,risk_level=EXCLUDED.risk_level,
          days_since_last_recharge=EXCLUDED.days_since_last_recharge,
          recharge_frequency=EXCLUDED.recharge_frequency,
          is_declining=EXCLUDED.is_declining,churn_probability=EXCLUDED.churn_probability`,
        [weekId, wid,
          num(row['rank']||row['排名']), num(row['prev_rank']||row['上周排名']),
          num(row['total_recharge']||row['总充值']||row['recharge']),
          num(row['total_spending']||row['总消费']||row['spending']),
          num(row['coin_balance']||row['币余额']),
          num(row['gift_count']||row['送礼次数']),
          num(row['gifted_streamers']||row['送礼主播数']),
          num(row['top_streamer_id']||row['最常送礼主播']),
          num(row['top_streamer_pct']||row['主播占比']),
          row['behavior_type']||row['行为类型']||null,
          num(row['health_score']||row['健康评分']),
          num(row['risk_score']||row['风险评分']),
          row['risk_level']||row['风险等级']||null,
          num(row['days_since_last_recharge']||row['距上次充值天数']),
          num(row['recharge_frequency']||row['充值频率']),
          toBool(row['is_declining']||row['下降趋势']),
          num(row['churn_probability']||row['流失概率'])
        ]
      );
      inserted++;
    }
    res.json({ success: true, message: `${week_code} 大R数据: ${inserted}条` });
  } catch (err) {
    console.error('Whale upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/message
router.post('/message', upload.single('file'), async (req, res) => {
  try {
    const { week_code, start_date, end_date } = req.body;
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    if (!week_code || !start_date || !end_date) return res.status(400).json({ error: '缺少周期信息' });

    const weekId = await ensureWeek(week_code, start_date, end_date);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (rows.length === 0) return res.status(400).json({ error: 'Excel为空' });

    console.log('Message upload:', rows.length, 'rows, columns:', Object.keys(rows[0]));

    const byStreamer = {};
    const rawMsgs = [];

    for (const row of rows) {
      const msgId = row['id']||row['message_id'];
      const sid = row['sender_id']||row['主播ID'];
      const payload = String(row['payload']||row['内容']||'').trim().replace(/^"|"$/g,'');
      const convId = row['conversation_id']||row['对话ID'];
      const createdAt = row['created_at']||row['时间'];
      const nick = row['nickname']||row['昵称']||'';
      if (!sid || !msgId) continue;

      if (!byStreamer[sid]) {
        byStreamer[sid] = {
          nick, seen: new Set(), total: 0, valuable: 0, convs: new Set(),
          cats: {daily:0,relationship:0,delivery:0,pricing:0,redirect:0,complaint:0,platform:0,dnd:0},
          plats: {snapchat:false,fambase:false,onlyfans:false,paypal:false,dropbox:false}
        };
      }
      const s = byStreamer[sid];
      const dk = `${sid}|${payload}`;
      if (s.seen.has(dk)) continue;
      s.seen.add(dk);
      s.total++;
      s.convs.add(convId);
      rawMsgs.push({msgId,sid,convId,payload,createdAt});

      if (isLowValue(payload)) continue;
      s.valuable++;
      const cat = detectCategory(payload);
      s.cats[cat]++;
      const pl = payload.toLowerCase();
      if (/onlyfans|sub to of/i.test(pl)) s.plats.onlyfans=true;
      if (/fambase|joinfambase/i.test(pl)) s.plats.fambase=true;
      if (/snapchat|snap /i.test(pl)) s.plats.snapchat=true;
      if (/paypal/i.test(pl)) s.plats.paypal=true;
      if (/dropbox/i.test(pl)) s.plats.dropbox=true;
    }

    let inserted = 0;
    for (const [sid, s] of Object.entries(byStreamer)) {
      await db.query(
        `INSERT INTO streamers (streamer_id,username,first_seen_week) VALUES ($1,$2,$3)
         ON CONFLICT (streamer_id) DO NOTHING`, [sid, s.nick, weekId]
      );
      await db.query(
        `INSERT INTO message_weekly
         (week_id,streamer_id,total_messages,valuable_messages,conversation_count,
          cat_daily_chat,cat_relationship,cat_content_delivery,cat_pricing,
          cat_external_redirect,cat_complaint,cat_platform_issue,cat_dnd,
          has_snapchat,has_fambase,has_onlyfans,has_paypal,has_dropbox)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (week_id,streamer_id) DO UPDATE SET
          total_messages=EXCLUDED.total_messages,valuable_messages=EXCLUDED.valuable_messages,
          conversation_count=EXCLUDED.conversation_count,
          cat_daily_chat=EXCLUDED.cat_daily_chat,cat_relationship=EXCLUDED.cat_relationship,
          cat_content_delivery=EXCLUDED.cat_content_delivery,cat_pricing=EXCLUDED.cat_pricing,
          cat_external_redirect=EXCLUDED.cat_external_redirect,cat_complaint=EXCLUDED.cat_complaint,
          cat_platform_issue=EXCLUDED.cat_platform_issue,cat_dnd=EXCLUDED.cat_dnd,
          has_snapchat=EXCLUDED.has_snapchat,has_fambase=EXCLUDED.has_fambase,
          has_onlyfans=EXCLUDED.has_onlyfans,has_paypal=EXCLUDED.has_paypal,
          has_dropbox=EXCLUDED.has_dropbox`,
        [weekId,sid, s.total,s.valuable,s.convs.size,
         s.cats.daily,s.cats.relationship,s.cats.delivery,s.cats.pricing,
         s.cats.redirect,s.cats.complaint,s.cats.platform,s.cats.dnd,
         s.plats.snapchat,s.plats.fambase,s.plats.onlyfans,s.plats.paypal,s.plats.dropbox]
      );
      inserted++;
    }

    // 批量存原始消息
    let rawInserted = 0;
    for (const m of rawMsgs) {
      try {
        await db.query(
          `INSERT INTO messages_raw (message_id,week_id,streamer_id,conversation_id,payload,created_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (message_id) DO NOTHING`,
          [m.msgId, weekId, m.sid, m.convId, m.payload, m.createdAt||null]
        );
        rawInserted++;
      } catch(e) { /* skip */ }
    }

    res.json({ success: true, message: `${week_code} 消息: ${inserted}位主播, ${rawMsgs.length}条(原始${rawInserted}条入库)` });
  } catch (err) {
    console.error('Message upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 辅助函数
function num(v) { if (v===null||v===undefined||v==='') return null; const n=Number(v); return isNaN(n)?null:n; }
function toBool(v) { return v===true||v===1||v==='1'||v==='true'||v==='TRUE'||v==='是'; }

function isLowValue(text) {
  const t = text.toLowerCase().trim();
  if (t.length < 5) return true;
  if (/^https?:\/\//.test(t) && t.split(/\s+/).length <= 2) return true;
  const pats = [/welcome to my group/,/welcome in/,/hi welcome/,/hey guys welcome/,
    /welcome in daddies/,/thank you for attending.*live session/,/jumping on live/,
    /dice.*vid/,/dice.*sex/,/firerwork.*get you/,/firework.*get you/,/money gun.*=/,
    /dream.*=.*get/,/lambo gets/,/no self promo/,/gallery sir.*special price/,
    /would u like my new.*gallery/,/bomb vids.*sex.*solo.*pee/,/firerwork today u get/,
    /long bomb vid/,/full porn video.*firerwork/,/20min.*porn.*fuck.*video/,
    /dnd wine.*pics.*vids/,/click on link and click/];
  for (const p of pats) if (p.test(t)) return true;
  const sw = ['yes','no','ok','yup','nope','oh','lol','haha','thanks','ty','np',
    'hey','hi','hello','hii','heyy','sure','okay','bet','added','yea','yeah'];
  if (sw.includes(t)) return true;
  return false;
}

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/onlyfans|sub to of|fambase|joinfambase|snap |snapchat|fam |paypal/.test(t)) return 'redirect';
  if (/\$|price|tip |coins|bundle|gallery|vids for|cost/.test(t)) return 'pricing';
  if (/clapper/.test(t)) return 'platform';
  if (/dnd/.test(t)) return 'dnd';
  if (/refund|scare|holding it against|rude|block/.test(t)) return 'complaint';
  if (/not working|problem|issue|broken|cant|can't|bug|tweaking|cut off/.test(t)) return 'complaint';
  if (/send|sending|sent you|link|dropbox|click/.test(t)) return 'delivery';
  if (/love|miss|sorry|thank|appreciate|happy/.test(t)) return 'relationship';
  return 'daily';
}

module.exports = router;
