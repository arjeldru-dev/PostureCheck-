import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ACHIEVEMENTS } from '@posture-check/shared';

/**
 * The achievement catalog exists twice: in TS (`ACHIEVEMENTS`, used by the UI
 * and the detection engine) and in SQLite (seeded by migrations, used for the
 * XP reward granted inside `unlock_achievement`). This test fails if they drift.
 *
 * When a later migration re-states the catalog, point CATALOG_MIGRATION at it.
 */
const CATALOG_MIGRATION = '../../../src-tauri/migrations/007_achievements_integrity.sql';

function parseCatalog() {
  const sql = readFileSync(fileURLToPath(new URL(CATALOG_MIGRATION, import.meta.url)), 'utf8');
  const block = sql.slice(sql.indexOf('-- CATALOG-BEGIN'), sql.indexOf('-- CATALOG-END'));
  const row = /\('([^']*)', '([^']*)', '([^']*)', '([^']*)', (\d+), '([^']*)', (\d+)\)/gu;
  return [...block.matchAll(row)].map((m) => ({
    id: m[1],
    name: m[2],
    description: m[3],
    icon: m[4],
    xp_reward: Number(m[5]),
    condition_type: m[6],
    condition_value: Number(m[7]),
  }));
}

describe('achievement catalog (TS ↔ SQLite)', () => {
  it('SQL catalog matches the shared ACHIEVEMENTS constant exactly', () => {
    const sqlRows = parseCatalog();
    expect(sqlRows).toHaveLength(ACHIEVEMENTS.length);
    expect(sqlRows).toEqual(ACHIEVEMENTS.map((a) => ({ ...a })));
  });
});
