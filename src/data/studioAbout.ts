export type StudioInfluence = {
  file: string;
  title: string;
  href?: string;
};

export const studioAbout: {
  statement: string;
  paragraphs: string[];
  education: Array<{ title: string; place: string; period: string }>;
  skills: string[];
  news: Array<{ date: string; text: string; demo?: boolean }>;
  influences: StudioInfluence[];
} = {
  statement: 'I make, collect and study images, words, sounds, and the spaces between them.',
  paragraphs: [
    'My practice moves between still and moving images, writing, design, and small experiments with form and technology. I am interested in how we remember, perform, and reimagine ourselves through the things we create.',
    'This site is my studio: an evolving map of work, notes, and obsessions.',
  ],
  education: [
    {
      title: 'B.Tech in Engineering Physics & M.Tech in Data Science',
      place: 'IIT Madras',
      period: '2018 — 2022',
    },
    {
      title: 'Diploma Certification',
      place: 'Pracheen Kala Kendra',
      period: '',
    },
  ],
  skills: ['digital illustration', 'data visualisation', 'creative coding', 'photography', 'watercolour', 'photo editing'],
  news: [],
  influences: [
    { file: 'beloved.jpg', title: 'Beloved — Toni Morrison', href: 'https://www.arts.gov/initiatives/nea-big-read/beloved' },
    { file: 'god-of-small-things.jpg', title: 'The God of Small Things — Arundhati Roy', href: 'https://en.wikipedia.org/wiki/The_God_of_Small_Things' },
    { file: 'andy-warhol-marilyn.webp', title: 'Andy Warhol', href: 'https://www.warhol.org/andy-warhols-life/' },
    { file: 'LaColonneBrisee-2_900x.jpg', title: 'Frida Kahlo', href: 'https://www.museofridakahlo.org.mx/frida/?lang=en' },
    { file: 'images.jpeg', title: 'Kandinsky', href: 'https://en.wikipedia.org/wiki/Wassily_Kandinsky' },
  ],
};
