# Clapper Dashboards Backend

后端API服务，提供Excel数据上传解析、数据库存储、以及看板数据查询。

## 技术栈

- **Node.js** + Express
- **PostgreSQL** (Render)
- **SheetJS (xlsx)** — Excel解析
- **Multer** — 文件上传

## 项目结构

```
src/
  index.js          — 主入口 + 上传页面
  db.js             — 数据库连接池
  db-init.js        — 建表脚本
  routes/
    weeks.js        — 周期管理
    upload.js       — Excel上传解析（核心）
    streamer.js     — 主播数据查询
    whale.js        — 大R数据查询
    message.js      — 消息数据查询
```

## Render 部署步骤

### 1. 创建 PostgreSQL 数据库

- Render Dashboard → New → PostgreSQL
- 名称: `clapper-db`
- 复制 **Internal Database URL**

### 2. 创建 Web Service

- Render Dashboard → New → Web Service
- 连接 GitHub 仓库 `clapper-backend`
- 配置:
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Environment Variables:
    - `DATABASE_URL` = (粘贴 Internal Database URL)
    - `NODE_ENV` = `production`

### 3. 初始化数据库

部署成功后，在 Render Shell 中运行:

```bash
node src/db-init.js
```

或者通过 Render 的 PostgreSQL 面板执行建表SQL。

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 上传页面 |
| `/api/health` | GET | 健康检查 |
| `/api/weeks` | GET | 周期列表 |
| `/api/upload/streamer` | POST | 上传主播Excel |
| `/api/upload/whale` | POST | 上传大R Excel |
| `/api/upload/message` | POST | 上传消息Excel |
| `/api/streamer/weekly?week=W5` | GET | 某周主播数据 |
| `/api/streamer/all-trends` | GET | 全部趋势 |
| `/api/whale/weekly?week=W5` | GET | 某周大R数据 |
| `/api/whale/all-trends` | GET | 全部趋势 |
| `/api/message/weekly?week=W5` | GET | 某周消息汇总 |
| `/api/message/trend` | GET | 消息趋势 |

## Excel 列名

上传的Excel支持中英文列名，自动匹配。详见 `upload.js`。
