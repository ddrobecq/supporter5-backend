import { createEntityService } from '../lib/baseService';

/** JOUEUR = statistiques par joueur et par saison */
export default createEntityService({
  table:           'JOUEUR',
  pk:              'JOCLEUNIK',
  selectCols:      [
    'JOCLEUNIK',
    'IDJOUEUR',
    'SAISON',
    'INTERNATIONAL',
    'BUTTOTAL',
    'POSTE',
    'PASSETOTAL',
    'JAUNETOTAL',
    'ROUGETOTAL',
    'TITULAIRETOTAL',
    'REMPTOTAL',
    'TEMPSTOTAL',
  ],
  allowedSortCols: ['JOCLEUNIK', 'SAISON', 'BUTTOTAL', 'TITULAIRETOTAL', 'TEMPSTOTAL', 'JAUNETOTAL', 'ROUGETOTAL'],
  searchCols:      ['IDJOUEUR'],
  filterCols:      ['SAISON', 'IDJOUEUR', 'POSTE'],
});
