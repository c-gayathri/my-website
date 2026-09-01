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
  news: Array<{ date: string; text: string; demo: boolean }>;
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
      period: '2018 - 2022',
    },
  ],
  skills: ['digital illustration', 'data visualisation', 'creative coding', 'photography'],
  news: [
    { date: 'May 2026', text: 'New cluster: Going Out', demo: true },
    { date: 'Jan 2026', text: 'Added new works to Swirl / Signal', demo: true },
    { date: 'Aug 2025', text: 'Small experiments in sound and text', demo: true },
    { date: 'Mar 2025', text: 'Bookshelf notes and recommendations added', demo: true },
    { date: 'Nov 2024', text: 'Studio archive opened', demo: true },
  ],
  influences: [
    { file: 'sample-17.png', title: 'folded geometry', href: '/studio/projects/yellow-geometry/' },
    { file: 'sample-20.png', title: 'magnolia, x-rayed', href: '/studio/projects/magnolia-xrayed/' },
    { file: 'sample-11.png', title: 'violet weather' },
    { file: 'sample-13.png', title: 'two people, one line', href: '/studio/projects/couple-after/' },
    { file: 'sample-19.png', title: 'small rose', href: '/studio/projects/small-rose/' },
    { file: 'sample-01.png', title: 'smoke, in four colours', href: '/studio/projects/smoke-in-four-colours/' },
  ],
};
