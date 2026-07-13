import { createEntityService } from '../lib/baseService';

/** JOUEURRG = registre général des joueurs (nom, prénom, date de naissance…) */
export default createEntityService({
  table:           'JOUEURRG',
  pk:              'IDJOUEUR',
  allowedSortCols: ['IDJOUEUR', 'NOM', 'PRENOM', 'NAISSANCE', 'POSTE', 'BUT', 'TITULAIRE'],
  searchCols:      ['NOM', 'PRENOM', 'SURNOM'],
  filterCols:      ['POSTE', 'IDNATIO'],
});
