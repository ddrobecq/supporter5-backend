import { createEntityService } from '../lib/baseService';

export interface TourDefRow {
  TDCLEUNIK: number;
  NOM: string;
  ALLER_RETOUR: number;
  VALEUR_VD: number;
  VALEUR_VE: number;
  VALEUR_ND: number;
  VALEUR_NE: number;
  VALEUR_DD: number;
  VALEUR_DE: number;
  BONUS_TYPE: number;
  BONUS_NB_BUT: number;
  VALEUR_BONUS_V: number;
  DUREE_TPS_REG: number;
  CLASS_GAD: number;
  TDTYPETOUR: number;
  VALEUR_BE: number;
  DUREE_TPS_PROLONG: number;
  FIN_PROLONG: number;
  FIN_TPS_REG: number;
  TDCLEFTRI: string;
  VALEUR_BONUS_N: number;
  VALEUR_BONUS_D: number;
  TDCalculDiffBut: number;
}

/** TOURDEF = tour definitions (configurations de règles) */
export default createEntityService({
  table:           'TOURDEF',
  pk:              'TDCLEUNIK',
  selectCols:      [
    'TDCLEUNIK',
    'NOM',
    'ALLER_RETOUR',
    'VALEUR_VD',
    'VALEUR_VE',
    'VALEUR_ND',
    'VALEUR_NE',
    'VALEUR_DD',
    'VALEUR_DE',
    'BONUS_TYPE',
    'BONUS_NB_BUT',
    'VALEUR_BONUS_V',
    'DUREE_TPS_REG',
    'CLASS_GAD',
    'TDTYPETOUR',
    'VALEUR_BE',
    'DUREE_TPS_PROLONG',
    'FIN_PROLONG',
    'FIN_TPS_REG',
    'TDCLEFTRI',
    'VALEUR_BONUS_N',
    'VALEUR_BONUS_D',
    'TDCalculDiffBut',
  ],
  allowedSortCols: ['TDCLEUNIK', 'NOM', 'TDTYPETOUR'],
  searchCols:      ['NOM'],
  filterCols:      ['TDTYPETOUR'],
});
