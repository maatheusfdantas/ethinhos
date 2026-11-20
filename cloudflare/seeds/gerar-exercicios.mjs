#!/usr/bin/env node
/**
 * Gera a base de exercícios do Ethos (seed SQL + planilha de revisão) a partir de:
 * - Free Exercise DB (Unlicense), arquivo dist/exercises.json do commit registrado em SOURCE_VERSION;
 * - cloudflare/seeds/exercicios-v1.curadoria.txt (nomes e instruções em português escritos pelo Ethos).
 * Uso: node cloudflare/seeds/gerar-exercicios.mjs <caminho do exercises.json>
 * O SQL é idempotente: reaplicar atualiza só linhas ainda não revisadas e nunca toca exercícios personalizados.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = 'free-exercise-db';
const SOURCE_VERSION = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const LICENSE = 'Unlicense (domínio público); nomes e instruções em português: Ethos';
const EXPECTED = 250;

const src = process.argv[2];
if (!src) { console.error('Informe o caminho do exercises.json da Free Exercise DB.'); process.exit(1); }
const base = new Map(JSON.parse(readFileSync(src, 'utf8')).map((e) => [e.id, e]));

const SHOULDER_POST = /rear|reverse_fl|reverse_machine|face_pull|external_rotation|row|pull_apart/i;
const SHOULDER_LAT = /lateral|laterals|upright/i;
function region(m, id) {
  if (m === 'shoulders') return SHOULDER_POST.test(id) ? 'deltoide_posterior' : SHOULDER_LAT.test(id) ? 'deltoide_lateral' : 'deltoide_anterior';
  return {
    abdominals: 'abdomen', hamstrings: 'posteriores', adductors: 'adutores', abductors: 'abdutores', quadriceps: 'quadriceps', biceps: 'biceps',
    chest: 'peitoral', 'middle back': 'dorso_medio', calves: 'panturrilhas', glutes: 'gluteos', 'lower back': 'lombar', lats: 'dorsal',
    triceps: 'triceps', traps: 'trapezio', forearms: 'antebraco', neck: 'pescoco'
  }[m];
}
const GROUP = {
  peitoral: 'Peito', dorsal: 'Costas', dorso_medio: 'Costas', trapezio: 'Costas', lombar: 'Costas',
  deltoide_anterior: 'Ombros', deltoide_lateral: 'Ombros', deltoide_posterior: 'Ombros', biceps: 'Braços', triceps: 'Braços', antebraco: 'Braços',
  quadriceps: 'Pernas', posteriores: 'Pernas', adutores: 'Pernas', abdutores: 'Pernas', panturrilhas: 'Pernas', gluteos: 'Glúteos',
  abdomen: 'Core', obliquos: 'Core', pescoco: 'Pescoço'
};
const EQUIP = { 'body only': 'Peso corporal', machine: 'Máquina', other: 'Outro', 'foam roll': 'Rolo de liberação', kettlebells: 'Kettlebell', dumbbell: 'Halteres', cable: 'Polia', barbell: 'Barra', bands: 'Elástico', 'medicine ball': 'Medicine ball', 'exercise ball': 'Bola suíça', 'e-z curl bar': 'Barra W' };
const LEVEL = { beginner: 'Iniciante', intermediate: 'Intermediário', expert: 'Avançado' };
const TYPE = { strength: 'Força', stretching: 'Alongamento', plyometrics: 'Pliometria', strongman: 'Strongman', powerlifting: 'Powerlifting', cardio: 'Cardio', 'olympic weightlifting': 'Levantamento olímpico' };
const TIME_IDS = /^(plank|side_bridge|stomach_vacuum|monster_walk)$/i;

const rows = [];
const seen = new Set();
const lines = readFileSync(join(here, 'exercicios-v1.curadoria.txt'), 'utf8').split(/\r?\n/);
for (const [n, raw] of lines.entries()) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const [sid, pt, how, adj = ''] = line.split('|').map((x) => x.trim());
  const e = base.get(sid);
  if (!e) throw new Error(`Linha ${n + 1}: id "${sid}" não existe na Free Exercise DB.`);
  if (!pt || !how) throw new Error(`Linha ${n + 1}: falta nome ou instrução.`);
  const id = `fe_${sid.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  if (seen.has(id)) throw new Error(`Linha ${n + 1}: "${sid}" repetido.`);
  seen.add(id);
  let primary = [...new Set((e.primaryMuscles || []).map((m) => region(m, sid)).filter(Boolean))];
  let secondary = [...new Set((e.secondaryMuscles || []).map((m) => region(m, sid)).filter(Boolean))];
  for (const part of adj.split(';').filter(Boolean)) {
    const [k, v] = part.split('=');
    const list = v.split(',').map((x) => x.trim()).filter(Boolean);
    for (const r of list) if (!GROUP[r]) throw new Error(`Linha ${n + 1}: músculo "${r}" desconhecido.`);
    if (k === 'p') primary = list; else if (k === 's') secondary = list;
  }
  secondary = secondary.filter((m) => !primary.includes(m));
  const cat = e.category;
  const group = cat === 'cardio' ? 'Cardio' : cat === 'stretching' ? 'Alongamento' : GROUP[primary[0]] || 'Outros';
  const equipment = /smith/i.test(sid) ? 'Smith' : EQUIP[e.equipment] || 'Nenhum';
  const metric = cat === 'stretching' || cat === 'cardio' || TIME_IDS.test(sid) ? 'tempo' : 'reps';
  rows.push({ id, sid, pt, en: e.name, group, primary, secondary, equipment, level: LEVEL[e.level] || 'Iniciante', type: TYPE[cat] || 'Força', how, metric });
}
if (rows.length !== EXPECTED) throw new Error(`A curadoria tem ${rows.length} exercícios; o combinado é ${EXPECTED}.`);
for (const r of rows) if (!r.primary.length) throw new Error(`${r.sid} ficou sem músculo principal.`);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const now = '2026-11-20T00:00:00.000Z';
const sql = [
  '-- Base de exercícios do Ethos v1 (gerada por cloudflare/seeds/gerar-exercicios.mjs; não editar à mão).',
  `-- Origem da estrutura: ${SOURCE} @ ${SOURCE_VERSION} (Unlicense). Nomes e instruções em português: Ethos (pendente de revisão).`,
  '-- Idempotente: reaplicar só atualiza linhas que ainda não foram revisadas; exercícios personalizados ficam em outra tabela.',
  ...rows.map((r) => `INSERT INTO exercise_library (id, name_pt, aliases_json, muscle_group, primary_json, secondary_json, equipment, level, type, metric, instructions_json, source, source_id, source_version, license, review_status, created_at, updated_at) VALUES (${[
    q(r.id), q(r.pt), q(JSON.stringify([r.en])), q(r.group), q(JSON.stringify(r.primary)), q(JSON.stringify(r.secondary)), q(r.equipment), q(r.level), q(r.type), q(r.metric),
    q(JSON.stringify([r.how])), q(SOURCE), q(r.sid), q(SOURCE_VERSION), q(LICENSE), q('pendente'), q(now), q(now)
  ].join(', ')}) ON CONFLICT(id) DO UPDATE SET name_pt = excluded.name_pt, aliases_json = excluded.aliases_json, muscle_group = excluded.muscle_group, primary_json = excluded.primary_json, secondary_json = excluded.secondary_json, equipment = excluded.equipment, level = excluded.level, type = excluded.type, metric = excluded.metric, instructions_json = excluded.instructions_json, source_version = excluded.source_version, license = excluded.license, updated_at = excluded.updated_at WHERE exercise_library.review_status != 'revisado';`)
];
writeFileSync(join(here, 'exercicios-v1.sql'), `${sql.join('\n')}\n`);
const csv = ['id;nome_pt;nome_en;grupo;principais;secundarios;equipamento;nivel;tipo;instrucao;revisado (sim/correção)']
  .concat(rows.map((r) => [r.id, r.pt, r.en, r.group, r.primary.join(','), r.secondary.join(','), r.equipment, r.level, r.type, r.how, ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')));
writeFileSync(join(here, 'exercicios-v1-revisao.csv'), `﻿${csv.join('\r\n')}\r\n`);
console.log(`${rows.length} exercícios gerados (${[...new Set(rows.map((r) => r.group))].map((g) => `${g}: ${rows.filter((r) => r.group === g).length}`).join(', ')}).`);
