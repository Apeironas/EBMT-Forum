// =============================================================
// EBMT Forum - Veritabanı başlatma + migration zinciri
// Çalıştırmak için: npm run db:init
// Sıra: init.sql → Hafta 3 → Hafta 4 → Hafta 5
// =============================================================

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const SQL_DIR = path.join(__dirname, '../sql');

const MIGRATION_FILES = [
  'init.sql',
  'week3_voting_karma_favorites_softdelete.sql',
  'week4_supabase_auth_profile_categories_fts.sql',
  'week5_notifications.sql',
  'week5b_profile_actor_vote_notifications.sql',
  'week6_rls.sql',
  'week6b_rls_cleanup.sql',
  'week6c_profiles_columns_fix.sql',
  'week6d_schema_drift_fix.sql',
  'week7_notifications_schema_fix.sql',
  'week8_handle_new_user_unique_username.sql',
  'week9_create_post_with_tags.sql',
  'week10_accepted_answer.sql',
  'week11_ban_enforcement.sql',
  'week12_unaccent_search.sql',
  'week13_notification_trigger_fix.sql',
  'week14_increment_view.sql'
];

async function initializeDatabase() {
  console.log('[init_db] Migration zinciri çalışıyor...');

  let client;
  try {
    client = await pool.connect();
    console.log('[init_db] Veritabanına bağlanıldı.');

    for (const file of MIGRATION_FILES) {
      const sqlFilePath = path.join(SQL_DIR, file);
      if (!fs.existsSync(sqlFilePath)) {
        console.warn(`[init_db] Atlanıyor (dosya yok): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(sqlFilePath, 'utf-8');
      console.log(`[init_db] ▶ ${file}`);
      await client.query(sql);
      console.log(`[init_db] ✓ ${file}`);
    }

    console.log('[init_db] ✅ Tüm migration dosyaları tamamlandı.');
  } catch (err) {
    console.error('[init_db] ❌ Hata:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

initializeDatabase();
