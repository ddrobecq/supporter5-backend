const path = require('node:path');
const Database = require('better-sqlite3');
const rencontresService = require('./dist/services/rencontres.service.js').default;

const db = new Database(path.resolve(process.cwd(), 'data/supporter.sqlite'));

function getMatch() {
  const sql = `SELECT r.RECLEUNIK,r.TUCLEUNIK,r.DOMICILE,r.EXTERIEUR,r.BUTDOM,r.BUTEXT,r.ETAT,
    COALESCE(pd.GROUPE,'') AS GROUPE
  FROM RENCO r
  JOIN PARTICIP pd ON pd.TUCLEUNIK=r.TUCLEUNIK AND pd.IDCLUB=r.DOMICILE
  JOIN PARTICIP pe ON pe.TUCLEUNIK=r.TUCLEUNIK AND pe.IDCLUB=r.EXTERIEUR AND COALESCE(pe.GROUPE,'')=COALESCE(pd.GROUPE,'')
  WHERE r.TUCLEUNIK>0 AND COALESCE(r.ETAT,0) IN (2,3)
  ORDER BY r.RECLEUNIK DESC LIMIT 1`;
  return db.prepare(sql).get();
}

function getStats(tourId, groupName, clubId) {
  return db.prepare(`SELECT IDCLUB, TUCLEUNIK, COALESCE(GROUPE,'') AS GROUPE, PANbPoints, PANbMatch, PAClassement, PANbBP, PANbBC, PADiff FROM PARTICIP WHERE TUCLEUNIK=? AND COALESCE(GROUPE,'')=? AND IDCLUB=?`).get(tourId, groupName, clubId);
}

(async () => {
  const m = getMatch();
  if (!m) {
    console.log('NO_MATCH');
    return;
  }

  const beforeDom = getStats(m.TUCLEUNIK, m.GROUPE, m.DOMICILE);
  const beforeExt = getStats(m.TUCLEUNIK, m.GROUPE, m.EXTERIEUR);
  const originalButDom = Number(m.BUTDOM || 0);
  const bumpedButDom = originalButDom + 1;

  await rencontresService.updateWithImpact(m.RECLEUNIK, { BUTDOM: bumpedButDom });
  const midDom = getStats(m.TUCLEUNIK, m.GROUPE, m.DOMICILE);
  const midExt = getStats(m.TUCLEUNIK, m.GROUPE, m.EXTERIEUR);

  await rencontresService.updateWithImpact(m.RECLEUNIK, { BUTDOM: originalButDom });
  const afterDom = getStats(m.TUCLEUNIK, m.GROUPE, m.DOMICILE);
  const afterExt = getStats(m.TUCLEUNIK, m.GROUPE, m.EXTERIEUR);

  console.log(JSON.stringify({
    match: m,
    beforeDom,
    midDom,
    afterDom,
    beforeExt,
    midExt,
    afterExt,
  }, null, 2));
})();
