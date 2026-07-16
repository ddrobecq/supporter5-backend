const { createClient } = require('@libsql/client');
require('dotenv').config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  console.error('❌ Missing TURSO_DATABASE_URL');
  process.exit(1);
}

const db = createClient({ url: tursoUrl, authToken: tursoAuthToken });

(async () => {
  try {
    // First, check columns
    console.log('📋 ARBITRE table columns:');
    const schemaResult = await db.execute('PRAGMA table_info(ARBITRE)');
    schemaResult.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

    console.log('\n🔍 Searching for arbitre 0410...');
    const result = await db.execute({
      sql: 'SELECT * FROM ARBITRE WHERE IDARBITRE = ?',
      args: ['0410'],
    });

    if (result.rows.length === 0) {
      console.log('❌ Arbitre 0410 not found');
    } else {
      const row = result.rows[0];
      console.log('\n✓ Arbitre found:');
      console.log(JSON.stringify(row, null, 2));
      
      // Check for photo column specifically
      const photoCol = Object.keys(row).find(k => k.toLowerCase().includes('photo'));
      if (photoCol) {
        console.log(`\n📷 Photo column: ${photoCol}`);
        console.log(`  Type: ${typeof row[photoCol]}`);
        console.log(`  Is null: ${row[photoCol] === null}`);
        if (row[photoCol]) {
          const photoStr = String(row[photoCol]);
          console.log(`  Length: ${photoStr.length}`);
          console.log(`  First 80 chars: ${photoStr.slice(0, 80)}`);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
