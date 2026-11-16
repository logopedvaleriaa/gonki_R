// Curated phonetic material: every Р below is hard [r], never soft [rʲ].
// Position is the position of the sound in the WORD, even inside a cluster.
export const WORDS = [
  { id: "rak", word: "рак", group: "начало", position: "начало", count: 1 },
  { id: "rama", word: "рама", group: "начало", position: "начало", count: 1 },
  {
    id: "raketa",
    word: "ракета",
    group: "начало",
    position: "начало",
    count: 1,
  },
  { id: "robot", word: "робот", group: "начало", position: "начало", count: 1 },
  {
    id: "gora",
    word: "гора",
    group: "середина",
    position: "середина",
    count: 1,
  },
  {
    id: "baran",
    word: "баран",
    group: "середина",
    position: "середина",
    count: 1,
  },
  {
    id: "korova",
    word: "корова",
    group: "середина",
    position: "середина",
    count: 1,
  },
  {
    id: "vorona",
    word: "ворона",
    group: "середина",
    position: "середина",
    count: 1,
  },
  { id: "shar", word: "шар", group: "конец", position: "конец", count: 1 },
  { id: "syr", word: "сыр", group: "конец", position: "конец", count: 1 },
  { id: "komar", word: "комар", group: "конец", position: "конец", count: 1 },
  {
    id: "pomidor",
    word: "помидор",
    group: "конец",
    position: "конец",
    count: 1,
  },
  {
    id: "samovar",
    word: "самовар",
    group: "конец",
    position: "конец",
    count: 1,
  },
  {
    id: "krab",
    word: "краб",
    group: "стечения",
    position: "середина",
    count: 1,
  },
  {
    id: "kran",
    word: "кран",
    group: "стечения",
    position: "середина",
    count: 1,
  },
  {
    id: "grusha",
    word: "груша",
    group: "стечения",
    position: "середина",
    count: 1,
  },
  {
    id: "traktor",
    word: "трактор",
    group: "стечения",
    position: null,
    count: 2,
  },
];
export const PHRASES = [
  ["shar", "красный шар"],
  ["samovar", "огромный самовар"],
  ["pomidor", "красный помидор"],
  ["baran", "горный баран"],
  ["krab", "большой краб"],
  ["traktor", "новый трактор"],
  ["gora", "высокая гора"],
  ["grusha", "сладкая груша"],
].map(([id, word]) => ({
  ...WORDS.find((x) => x.id === id),
  word,
  phrase: true,
}));
export const GROUPS = ["начало", "середина", "конец", "стечения"];
export const TASKS = [
  "Назови",
  "Повтори три раза",
  "Добавь слово-признак",
  "Составь предложение",
  "Опиши предмет, не называя его",
];
export function shuffled(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function material(settings) {
  let list = settings.material === "phrases" ? PHRASES : WORDS;
  if (settings.speechGroup !== "все")
    list = list.filter((x) => x.group === settings.speechGroup);
  const own = (settings.words || "")
    .split("\n")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (own.length) {
    const selected = list.filter((x) => own.includes(x.word));
    if (selected.length) list = selected;
  }
  return list.length ? list : settings.material === "phrases" ? PHRASES : WORDS;
}
export function conveyorMaterial(settings) {
  const rows = (settings.conveyorWords || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const list = WORDS.filter((x) => x.count === 1);
  const selected = rows
    .map((row) => {
      const [word, position] = row
        .split("|")
        .map((x) => x.trim().toLowerCase());
      return list.find((x) => x.word === word && x.position === position);
    })
    .filter(Boolean);
  return shuffled(selected.length ? selected : list).slice(0, 9);
}
export function photo(item, captions = false) {
  return `<span class="object-picture"><img src="${import.meta.env.BASE_URL}images/watercolor/${item.id}.png" alt="${item.word}" draggable="false"><span class="object-caption" ${captions ? "" : "hidden"}>${item.word}</span></span>`;
}
