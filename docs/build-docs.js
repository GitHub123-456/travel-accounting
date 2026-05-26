const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, '../frontend/node_modules/marked'));

const DOCS = [
  { file: 'PRD.md', title: '产品需求文档', icon: '📋' },
  { file: 'USER_GUIDE.md', title: '用户使用手册', icon: '📖' },
  { file: 'TECH_DESIGN.md', title: '技术设计文档', icon: '🏗' },
  { file: 'API.md', title: 'API 接口文档', icon: '🔲' },
  { file: 'DATABASE.md', title: '数据库文档', icon: '🗄' },
  { file: 'TEST_PLAN.md', title: '测试计划', icon: '🧪' },
];

let tabs = '', contents = '';
DOCS.forEach((doc, i) => {
  const fp = path.join(__dirname, doc.file);
  if (!fs.existsSync(fp)) return;
  const html = marked.parse(fs.readFileSync(fp, 'utf-8'));
  const id = doc.file.replace('.md', '').toLowerCase();
  const active = i === 0 ? ' active' : '';
  tabs += `<div class="tab${active}" onclick="switchTab('${id}')">${doc.icon} ${doc.title}</div>\n`;
  contents += `<div class="doc-content${active}" id="${id}">${html}</div>\n`;
});

const page = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>旅行记账系统 - 项目文档</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;color:#333}
.header{background:#1A1A2E;color:#fff;padding:24px 0 0;text-align:center;position:sticky;top:0;z-index:10}
.header h1{font-size:22px;font-weight:700;margin-bottom:4px;display:inline;vertical-align:middle}
.header p{font-size:12px;opacity:.8;margin-bottom:16px}
.tabs{display:flex;justify-content:center;gap:0;background:rgba(255,255,255,.05);padding:0 16px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tabs::-webkit-scrollbar{display:none}
.tab{flex-shrink:0;padding:10px 18px;font-size:13px;color:rgba(255,255,255,.7);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .2s}
.tab:hover{color:#fff}
.tab.active{color:#C8E64E;border-bottom-color:#C8E64E;font-weight:600}
.main{max-width:860px;margin:24px auto;padding:0 20px 60px}
.doc-content{display:none;background:#fff;border-radius:12px;padding:32px 28px;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.doc-content.active{display:block}
.doc-content h1{font-size:22px;font-weight:700;color:#222;margin:0 0 16px;padding-bottom:12px;border-bottom:2px solid #C8E64E}
.doc-content h2{font-size:18px;font-weight:600;color:#333;margin:28px 0 12px;padding-bottom:8px;border-bottom:1px solid #f0f0f0}
.doc-content h3{font-size:15px;font-weight:600;color:#444;margin:20px 0 8px}
.doc-content p{font-size:14px;line-height:1.8;margin:8px 0;color:#444}
.doc-content ul,.doc-content ol{padding-left:20px;margin:8px 0}
.doc-content li{font-size:14px;line-height:1.8;color:#444;margin:4px 0}
.doc-content table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.doc-content th,.doc-content td{padding:8px 12px;border:1px solid #eee;text-align:left}
.doc-content th{background:#f8f9fa;font-weight:600;color:#333}
.doc-content tr:nth-child(even){background:#fafafa}
.doc-content code{background:#f0f4f8;color:#e74c3c;padding:2px 6px;border-radius:4px;font-size:13px;font-family:"SF Mono",Consolas,monospace}
.doc-content pre{background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow-x:auto;margin:12px 0;font-size:13px;line-height:1.6}
.doc-content pre code{background:none;color:inherit;padding:0}
.doc-content blockquote{border-left:3px solid #C8E64E;padding:8px 16px;margin:12px 0;background:#F5F8E8;border-radius:0 8px 8px 0}
.doc-content hr{border:none;border-top:1px solid #eee;margin:24px 0}
.doc-content a{color:#C8E64E;text-decoration:none}
.doc-content strong{color:#222}
@media(max-width:600px){.main{padding:0 10px 40px}.doc-content{padding:18px 14px}.tab{padding:10px 12px;font-size:12px}}
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:4px">
    <img src="logo.svg" alt="logo" style="width:40px;height:40px;border-radius:10px">
    <h1>旅行记账系统</h1>
  </div>
  <p>项目文档中心</p>
  <div class="tabs">${tabs}</div>
</div>
<div class="main">${contents}</div>
<script>
function switchTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.doc-content').forEach(c=>c.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const tabs=document.querySelectorAll('.tab');
  const docs=document.querySelectorAll('.doc-content');
  for(let i=0;i<docs.length;i++){if(docs[i].id===id){tabs[i]?.classList.add('active');break}}
  window.scrollTo({top:0,behavior:'smooth'});
}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), page, 'utf-8');
console.log('文档站已生成: docs/index.html');
