import { shuffled } from './speech.js';

export const DOBBLE_ROUNDS = 10;

// Every pair of cards has exactly one shared picture; all other IDs are unique.
export function dobbleRounds(pictures, difficulty = 'normal') {
  const pool = [...new Map(pictures.map(item => [item.id, item])).values()];
  if (pool.length < 5) throw new Error('Для Доббля нужно минимум пять картинок');
  const answers = shuffled(pool);
  return Array.from({ length: DOBBLE_ROUNDS }, (_, round) => {
    const level = round < 3 ? 0 : round < 6 ? 1 : 2;
    const desired = (difficulty === 'easy' ? 3 : difficulty === 'hard' ? 5 : 4) + level;
    const count = Math.min(desired, Math.floor((pool.length + 1) / 2));
    const common = answers[round % answers.length];
    const others = shuffled(pool.filter(item => item.id !== common.id));
    return {
      common: common.id,
      cards: [
        shuffled([common, ...others.slice(0, count - 1)]),
        shuffled([common, ...others.slice(count - 1, (count - 1) * 2)]),
      ],
    };
  });
}

export function dobbleLayout(count) {
  const angle = Math.random() * Math.PI * 2;
  const size = count <= 4 ? 27 : count <= 6 ? 23 : 21;
  const radius = count <= 4 ? 28 : 32;
  return shuffled(Array.from({ length: count }, (_, index) => {
    const a = angle + (index - 1) * Math.PI * 2 / (count - 1);
    return {
      x: index ? 50 + Math.cos(a) * radius : 50,
      y: index ? 50 + Math.sin(a) * radius : 50,
      size: size * (.93 + Math.random() * .14),
      rotation: (Math.random() - .5) * 22,
    };
  }));
}
