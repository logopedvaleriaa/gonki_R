import { WORDS, PHRASES, material, shuffled } from "./speech.js";
export const MEMORY_ROUNDS = [5, 10];
const EXTRA_PHRASES = {
  rak: "большой рак",
  rama: "новая рама",
  raketa: "большая ракета",
  robot: "новый робот",
  korova: "большая корова",
  vorona: "серая ворона",
  syr: "вкусный сыр",
  komar: "маленький комар",
  kran: "подъёмный кран",
};
// Each pair has a unique picture, even with captions hidden or a short teacher list.
export function memoryPictures(settings, pairs) {
  const phrases = settings.material === "phrases";
  const all = WORDS.map((item) =>
    phrases
      ? {
          ...item,
          word:
            PHRASES.find((p) => p.id === item.id)?.word ||
            EXTRA_PHRASES[item.id],
          phrase: true,
        }
      : item,
  );
  const preferred = shuffled(material(settings)),
    seen = new Set(),
    pool = [];
  for (const item of [...preferred, ...shuffled(all)])
    if (!seen.has(item.id)) {
      seen.add(item.id);
      pool.push(item);
    }
  return pool.slice(0, pairs);
}
