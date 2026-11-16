export const RACE_ACTIVITIES = [
 {game:'memory',title:'Мемори',at:.07},
 {game:'part',title:'Найди часть',at:.2},
 {game:'odd',title:'Четвёртый лишний',at:.34},
 {game:'ttt',title:'Крестики-нолики',at:.48},
 {game:'shadow',title:'Найди тень',at:.62},
 {game:'route',title:'Запомни картинки',at:.76},
 {game:'missing',title:'Что пропало?',at:.9},
 {game:'dobble',title:'Доббль',at:.97},
];

// Appending a stop keeps all saved indices stable. An already started free lap
// keeps its old plan so that installing the update never sends a child back.
export function activitiesForRun(run) {
  run.activityCount ??= run.freeLap ? 7 : RACE_ACTIVITIES.length;
  return RACE_ACTIVITIES.slice(0, run.activityCount);
}
