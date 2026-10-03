const fs = require('fs');

const ptFile = 'd:/Projetos/openreply/lib/i18n/pt-BR.json';
const zhFile = 'd:/Projetos/openreply/lib/i18n/zh-TW.json';

const ptData = JSON.parse(fs.readFileSync(ptFile, 'utf8'));
const zhData = JSON.parse(fs.readFileSync(zhFile, 'utf8'));

const newPt = {
  'Settings': 'Configurações',
  'Manage your workspace, connections and team members.': 'Gerencie seu workspace, conexões e membros da equipe.',
  'Settings tabs': 'Abas de configurações',
  'General': 'Geral',
  'Integrations': 'Integrações',
  'Team': 'Equipe',
  'Team Members': 'Membros da Equipe',
  'Invite a new member': 'Convidar novo membro',
  'Connected via Zernio': 'Conectado via Zernio'
};

const newZh = {
  'Settings': '設定',
  'Manage your workspace, connections and team members.': '管理您的工作空間、連線和團隊成員。',
  'Settings tabs': '設定分頁',
  'General': '一般',
  'Integrations': '整合',
  'Team': '團隊',
  'Team Members': '團隊成員',
  'Invite a new member': '邀請新成員',
  'Connected via Zernio': '透過 Zernio 連線'
};

Object.assign(ptData, newPt);
Object.assign(zhData, newZh);

fs.writeFileSync(ptFile, JSON.stringify(ptData, null, 2));
fs.writeFileSync(zhFile, JSON.stringify(zhData, null, 2));
