const fs = require('fs');

const ptFile = 'd:/Projetos/openreply/lib/i18n/pt-BR.json';
const zhFile = 'd:/Projetos/openreply/lib/i18n/zh-TW.json';

const ptData = JSON.parse(fs.readFileSync(ptFile, 'utf8'));
const zhData = JSON.parse(fs.readFileSync(zhFile, 'utf8'));

const newPt = {
  'Token refresh failed for @{username}: {error}': 'A atualização de token falhou para @{username}: {error}',
  'DM worker job {id} failed: {error}': 'O job {id} do worker de DM falhou: {error}',
  'DM worker process error: {error}': 'Erro no processo do worker de DM: {error}',
  'Comment sweep "{campaign}" [{keywords}]: {enqueued} enqueued, {matched} matched, {replied} already replied': 'Varredura de comentários "{campaign}" [{keywords}]: {enqueued} na fila, {matched} correspondentes, {replied} já respondidos',
  'Instagram webhook': 'Webhook do Instagram',
  'Follow gate rejected a button tap': 'O gate de follow rejeitou o clique no botão',
  'Follower snapshot failed': 'Falha no snapshot de seguidores',
  'Instagram connection failed': 'A conexão com o Instagram falhou',
  'Webhook signature verification failed': 'Falha na verificação de assinatura do Webhook'
};

const newZh = {
  'Token refresh failed for @{username}: {error}': '更新 @{username} 的權杖失敗：{error}',
  'DM worker job {id} failed: {error}': 'DM worker job {id} 失敗：{error}',
  'DM worker process error: {error}': 'DM worker 處理錯誤：{error}',
  'Comment sweep "{campaign}" [{keywords}]: {enqueued} enqueued, {matched} matched, {replied} already replied': '評論清理 "{campaign}" [{keywords}]：已加入佇列 {enqueued} 個，匹配 {matched} 個，已回覆 {replied} 個',
  'Instagram webhook': 'Instagram webhook',
  'Follow gate rejected a button tap': 'Follow gate 拒絕了按鈕點擊',
  'Follower snapshot failed': '追蹤者快照失敗',
  'Instagram connection failed': 'Instagram 連線失敗',
  'Webhook signature verification failed': 'Webhook 簽名驗證失敗'
};

Object.assign(ptData, newPt);
Object.assign(zhData, newZh);

fs.writeFileSync(ptFile, JSON.stringify(ptData, null, 2));
fs.writeFileSync(zhFile, JSON.stringify(zhData, null, 2));
