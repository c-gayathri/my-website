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
  news: Array<{ date: string; text: string; href?: string; demo?: boolean }>;
  influences: StudioInfluence[];
} = {
  statement: 'I enjoy creating. Art, writing, a secret third thing - anything goes.',
  paragraphs: [
    'I enjoy experimenting with different kinds of media, especially when they can flow into each other. Illustrating poems, animations set to narrations, animations flowing into my performances - the more I mesh, the better.',
    'My current obsession is making whacky colours riot together to create visceral unsettling images. Digital art is great for playing around with colours. I am also trained in traditional media like watercolours and sketching, though I believe creativity can only be self-taught.',
    'This is my world: an evolving map of images, notes, and obsessions, and how they play into each other.',
  ],
  education: [
    {
      title: 'B.Tech in Engineering Physics & M.Tech in Data Science',
      place: 'IIT Madras',
      period: '2017 — 2022',
    },
    {
      title: 'Diploma Certification',
      place: 'Pracheen Kala Kendra',
      period: '',
    },
  ],
  skills: ['graphic art', 'watercolours', 'sketching','writing', 'animation',''],
  news: [{
    date: '2026',
    text: 'Started the Third Space Reader\'s Society in Koramangala, Bangalore',
    href: 'https://www.instagram.com/thirdspace_reads_blr/',
  },
  {
    date: '2023',
    text: 'A regular at the Urban Sketchers Mumbai meetups',
    href: 'https://www.instagram.com/thirdspace_reads_blr/',
  },
  {
    date: '2022',
    text: 'Went to as many museums as possible in Paris and whereabouts! Centre Pompidou was a favourite hang (best sunset view in Paris and introduced me to Kandisnky)',
  },
  {
    date: '2022',
    text: 'Attended the Vulcan Art Residency in Goa',
  },
{
    date: '2021',
    text: 'Started the Silent Book Club at IIT Madras',
  },
{
    date: '2021',
    text: 'Collaborated with Srirang Vaidya to create cover art for his song "Zaroorat"',
  },
{
    date: '2021',
    text: 'Collaborated with Shreya Ugale to create cover art for her song',
  },
{
    date: '2019',
    text: 'Designed t-shirts and hoodies for Saarang, IIT Madras',
  },
{
    date: '2019',
    text: 'Designed jerseys for Sharavati hostel',
  }],
  influences: [
    { file: 'god-of-small-things.jpg', title: 'Arundhati Roy', href: '/studio/bookshelf/the-god-of-small-things' },
    { file: 'andy-warhol-marilyn.webp', title: 'Andy Warhol', href: 'https://www.warhol.org/andy-warhols-life/' },
    { file: 'LaColonneBrisee-2_900x.jpg', title: 'Frida Kahlo', href: 'https://www.museofridakahlo.org.mx/frida/?lang=en' },
    { file: 'images.jpeg', title: 'Kandinsky', href: 'https://en.wikipedia.org/wiki/Wassily_Kandinsky' },
    { file: 'billie.jpg', title: 'Billie Eilish', href: 'https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DA' },
  ],
};
