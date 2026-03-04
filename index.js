// src/index.js — 主服务入口
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/weeks', require('./weeks'));
app.use('/api/upload', require('./upload'));
app.use('/api/streamer', require('./streamer'));
app.use('/api/whale', require('./whale'));
app.use('/api/message', require('./message'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 上传页面（简易HTML）
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Clapper 数据上传</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:40px 20px}
.container{max-width:600px;margin:0 auto}
h1{font-size:24px;margin-bottom:8px;color:#f1f5f9}
h1 span{color:#f59e0b}
.sub{color:#64748b;font-size:14px;margin-bottom:32px}
.card{background:rgba(255,255,255,0.03);border:1px solid rgba(148,163,184,0.1);border-radius:12px;padding:24px;margin-bottom:16px}
.card h2{font-size:16px;margin-bottom:16px;color:#f1f5f9}
.field{margin-bottom:16px}
.field label{display:block;font-size:13px;color:#94a3b8;margin-bottom:6px}
.field input,.field select{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.2);background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:14px}
.field input[type=file]{padding:8px}
.btn{width:100%;padding:12px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-primary{background:#f59e0b;color:#0f172a}
.btn-primary:hover{background:#d97706}
.btn-primary:disabled{background:#64748b;cursor:not-allowed}
.status{margin-top:12px;padding:12px;border-radius:8px;font-size:13px;display:none}
.status.ok{display:block;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#34d399}
.status.err{display:block;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171}
.status.loading{display:block;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);color:#fbbf24}
.weeks{margin-top:16px;font-size:13px;color:#64748b}
.weeks span{display:inline-block;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.05);margin:2px;color:#94a3b8}
</style>
</head>
<body>
<div class="container">
  <h1>📤 Clapper <span>数据上传</span></h1>
  <p class="sub">每周上传Excel数据，自动解析入库</p>
  
  <div class="card">
    <h2>📅 数据周期</h2>
    <div class="field">
      <label>周标识 (如 W6)</label>
      <input type="text" id="weekCode" placeholder="W6">
    </div>
    <div style="display:flex;gap:12px">
      <div class="field" style="flex:1">
        <label>开始日期</label>
        <input type="date" id="startDate">
      </div>
      <div class="field" style="flex:1">
        <label>结束日期</label>
        <input type="date" id="endDate">
      </div>
    </div>
    <div class="weeks" id="existingWeeks">已有周期: 加载中...</div>
  </div>

  <div class="card">
    <h2>🎙️ 主播Top50 Excel</h2>
    <div class="field">
      <input type="file" id="streamerFile" accept=".xlsx,.xls,.csv">
    </div>
    <button class="btn btn-primary" onclick="upload('streamer')">上传并解析</button>
    <div class="status" id="status-streamer"></div>
  </div>

  <div class="card">
    <h2>🐋 大R Top50 Excel</h2>
    <div class="field">
      <input type="file" id="whaleFile" accept=".xlsx,.xls,.csv">
    </div>
    <button class="btn btn-primary" onclick="upload('whale')">上传并解析</button>
    <div class="status" id="status-whale"></div>
  </div>

  <div class="card">
    <h2>💬 Message数据 Excel</h2>
    <div class="field">
      <input type="file" id="messageFile" accept=".xlsx,.xls,.csv">
    </div>
    <button class="btn btn-primary" onclick="upload('message')">上传并解析</button>
    <div class="status" id="status-message"></div>
  </div>
</div>

<script>
// 加载已有周期
fetch('/api/weeks').then(r=>r.json()).then(data=>{
  const el=document.getElementById('existingWeeks');
  if(data.length===0){el.textContent='已有周期: 暂无';return}
  el.innerHTML='已有周期: '+data.map(w=>'<span>'+w.week_code+'('+w.start_date.slice(5)+'~'+w.end_date.slice(5)+')</span>').join('');
}).catch(()=>{document.getElementById('existingWeeks').textContent='已有周期: 加载失败'});

async function upload(type){
  const fileInput=document.getElementById(type+'File');
  const weekCode=document.getElementById('weekCode').value.trim();
  const startDate=document.getElementById('startDate').value;
  const endDate=document.getElementById('endDate').value;
  const status=document.getElementById('status-'+type);
  
  if(!fileInput.files[0]){status.className='status err';status.textContent='请选择文件';return}
  if(!weekCode||!startDate||!endDate){status.className='status err';status.textContent='请填写周期信息';return}
  
  const formData=new FormData();
  formData.append('file',fileInput.files[0]);
  formData.append('week_code',weekCode);
  formData.append('start_date',startDate);
  formData.append('end_date',endDate);
  
  status.className='status loading';
  status.textContent='上传解析中...';
  
  try{
    const res=await fetch('/api/upload/'+type,{method:'POST',body:formData});
    const data=await res.json();
    if(data.success){
      status.className='status ok';
      status.textContent='✅ '+data.message;
    }else{
      status.className='status err';
      status.textContent='❌ '+data.error;
    }
  }catch(e){
    status.className='status err';
    status.textContent='❌ 网络错误: '+e.message;
  }
}
</script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Clapper Backend running on port ${PORT}`);
});
