// ── News ─────────────────────────────────────────────────────────────────
// Short chronological updates. The newest item must be the FIRST entry —
// the page renders the array in order, top to bottom.
//
//   date: free-text label shown on the left (a year, "May 2024", …)
//   href: optional — makes the item text a link

export type NewsItem = {
  date: string;
  text: string;
  href?: string;
};

export const news: NewsItem[] = [
  {
    date: '2025',
    text: '“The Role of Preference Data and Unembeddings in the Convergence Rate of DPO” at the ARLET Workshop, NeurIPS 2025.',
    href: 'https://neurips.cc/virtual/2025/loc/san-diego/136118',
  },
  {
    date: '2025',
    text: 'Participated in the Google DeepMind Research Symposium',
  },
  {
    date: '2022',
    text: 'Graduated from IIT Madras with a B.Tech. in Engineering Physics and an Integrated M.Tech. in Data Science.',
  },
];
