import { dataHandler } from '../lib/responseHelpers';
import { getClubsIncomplets, getJoueursIncomplets, getRencontresIncompletes } from '../services/incomplets.service';

export const getJoueursIncompletsList = dataHandler(() => getJoueursIncomplets());

export const getClubsIncompletsList = dataHandler(() => getClubsIncomplets());

export const getRencontresIncompletesList = dataHandler(() => getRencontresIncompletes());
