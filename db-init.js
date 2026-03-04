// src/db-init.js — 数据库初始化：建表 + 索引
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const SQL = `
-- ===========================
-- 公共引用表
-- ===========================

CREATE TABLE IF NOT EXISTS weeks (
    week_id     SERIAL PRIMARY KEY,
    week_code   VARCHAR(10) UNIQUE NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streamers (
    streamer_id     BIGINT PRIMARY KEY,
    username        VARCHAR(100) NOT NULL,
    display_name    VARCHAR(100),
    first_seen_week INTEGER REFERENCES weeks(week_id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whales (
    whale_id        BIGINT PRIMARY KEY,
    username        VARCHAR(100) NOT NULL,
    display_name    VARCHAR(100),
    first_seen_week INTEGER REFERENCES weeks(week_id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- 主播Top50看板
-- ===========================

CREATE TABLE IF NOT EXISTS streamer_weekly (
    id                      SERIAL PRIMARY KEY,
    week_id                 INTEGER NOT NULL REFERENCES weeks(week_id),
    streamer_id             BIGINT NOT NULL REFERENCES streamers(streamer_id),
    rank                    INTEGER,
    prev_rank               INTEGER,
    tier                    VARCHAR(2),
    total_revenue           DECIMAL(12,2) DEFAULT 0,
    day1_revenue            DECIMAL(10,2) DEFAULT 0,
    day2_revenue            DECIMAL(10,2) DEFAULT 0,
    day3_revenue            DECIMAL(10,2) DEFAULT 0,
    day4_revenue            DECIMAL(10,2) DEFAULT 0,
    day5_revenue            DECIMAL(10,2) DEFAULT 0,
    day6_revenue            DECIMAL(10,2) DEFAULT 0,
    day7_revenue            DECIMAL(10,2) DEFAULT 0,
    total_viewers           INTEGER DEFAULT 0,
    paying_users            INTEGER DEFAULT 0,
    payment_rate            DECIMAL(5,4) DEFAULT 0,
    arppu                   DECIMAL(10,2) DEFAULT 0,
    arpu                    DECIMAL(10,2) DEFAULT 0,
    quadrant                VARCHAR(20),
    composite_score         DECIMAL(5,2) DEFAULT 0,
    is_new_entrant          BOOLEAN DEFAULT FALSE,
    is_unstable             BOOLEAN DEFAULT FALSE,
    revenue_concentration   DECIMAL(5,4) DEFAULT 0,
    funnel_diagnosis        VARCHAR(50),
    notes                   TEXT,
    UNIQUE(week_id, streamer_id)
);

-- ===========================
-- 大R Top50看板
-- ===========================

CREATE TABLE IF NOT EXISTS whale_weekly (
    id                          SERIAL PRIMARY KEY,
    week_id                     INTEGER NOT NULL REFERENCES weeks(week_id),
    whale_id                    BIGINT NOT NULL REFERENCES whales(whale_id),
    rank                        INTEGER,
    prev_rank                   INTEGER,
    total_recharge              DECIMAL(12,2) DEFAULT 0,
    total_spending              DECIMAL(12,2) DEFAULT 0,
    coin_balance                DECIMAL(12,2) DEFAULT 0,
    gift_count                  INTEGER DEFAULT 0,
    gifted_streamers            INTEGER DEFAULT 0,
    top_streamer_id             BIGINT,
    top_streamer_pct            DECIMAL(5,4) DEFAULT 0,
    behavior_type               VARCHAR(20),
    health_score                DECIMAL(5,2) DEFAULT 0,
    risk_score                  DECIMAL(5,2) DEFAULT 0,
    risk_level                  VARCHAR(10),
    days_since_last_recharge    INTEGER,
    recharge_frequency          DECIMAL(5,2) DEFAULT 0,
    is_declining                BOOLEAN DEFAULT FALSE,
    churn_probability           DECIMAL(5,4) DEFAULT 0,
    notes                       TEXT,
    UNIQUE(week_id, whale_id)
);

CREATE TABLE IF NOT EXISTS whale_streamer_gifts (
    id              SERIAL PRIMARY KEY,
    week_id         INTEGER NOT NULL REFERENCES weeks(week_id),
    whale_id        BIGINT NOT NULL REFERENCES whales(whale_id),
    streamer_id     BIGINT NOT NULL REFERENCES streamers(streamer_id),
    gift_amount     DECIMAL(10,2) DEFAULT 0,
    gift_count      INTEGER DEFAULT 0,
    UNIQUE(week_id, whale_id, streamer_id)
);

-- ===========================
-- Message分析看板
-- ===========================

CREATE TABLE IF NOT EXISTS message_weekly (
    id                      SERIAL PRIMARY KEY,
    week_id                 INTEGER NOT NULL REFERENCES weeks(week_id),
    streamer_id             BIGINT NOT NULL REFERENCES streamers(streamer_id),
    total_messages          INTEGER DEFAULT 0,
    valuable_messages       INTEGER DEFAULT 0,
    conversation_count      INTEGER DEFAULT 0,
    cat_daily_chat          INTEGER DEFAULT 0,
    cat_relationship        INTEGER DEFAULT 0,
    cat_content_delivery    INTEGER DEFAULT 0,
    cat_pricing             INTEGER DEFAULT 0,
    cat_external_redirect   INTEGER DEFAULT 0,
    cat_complaint           INTEGER DEFAULT 0,
    cat_platform_issue      INTEGER DEFAULT 0,
    cat_dnd                 INTEGER DEFAULT 0,
    has_snapchat            BOOLEAN DEFAULT FALSE,
    has_fambase             BOOLEAN DEFAULT FALSE,
    has_onlyfans            BOOLEAN DEFAULT FALSE,
    has_paypal              BOOLEAN DEFAULT FALSE,
    has_dropbox             BOOLEAN DEFAULT FALSE,
    ai_summary              TEXT,
    risk_signals            JSONB DEFAULT '[]',
    UNIQUE(week_id, streamer_id)
);

CREATE TABLE IF NOT EXISTS messages_raw (
    message_id      BIGINT PRIMARY KEY,
    week_id         INTEGER REFERENCES weeks(week_id),
    streamer_id     BIGINT REFERENCES streamers(streamer_id),
    conversation_id BIGINT,
    payload         TEXT,
    category        VARCHAR(30),
    is_valuable     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_key_excerpts (
    id              SERIAL PRIMARY KEY,
    week_id         INTEGER NOT NULL REFERENCES weeks(week_id),
    streamer_id     BIGINT NOT NULL REFERENCES streamers(streamer_id),
    message_time    TIMESTAMP,
    message_text    TEXT NOT NULL,
    tag             VARCHAR(20),
    importance      INTEGER DEFAULT 0
);

-- ===========================
-- 索引
-- ===========================

CREATE INDEX IF NOT EXISTS idx_sw_week ON streamer_weekly(week_id);
CREATE INDEX IF NOT EXISTS idx_sw_streamer ON streamer_weekly(streamer_id);
CREATE INDEX IF NOT EXISTS idx_ww_week ON whale_weekly(week_id);
CREATE INDEX IF NOT EXISTS idx_ww_whale ON whale_weekly(whale_id);
CREATE INDEX IF NOT EXISTS idx_mw_week ON message_weekly(week_id);
CREATE INDEX IF NOT EXISTS idx_mw_streamer ON message_weekly(streamer_id);
CREATE INDEX IF NOT EXISTS idx_mr_week_streamer ON messages_raw(week_id, streamer_id);
CREATE INDEX IF NOT EXISTS idx_mke_week ON message_key_excerpts(week_id);
CREATE INDEX IF NOT EXISTS idx_wsg_whale ON whale_streamer_gifts(whale_id);
CREATE INDEX IF NOT EXISTS idx_wsg_streamer ON whale_streamer_gifts(streamer_id);
`;

async function init() {
  console.log('🔧 Initializing database...');
  try {
    await pool.query(SQL);
    console.log('✅ All tables and indexes created successfully!');
    
    // 显示所有表
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('\n📋 Tables:');
    res.rows.forEach(r => console.log('  -', r.table_name));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

init();
