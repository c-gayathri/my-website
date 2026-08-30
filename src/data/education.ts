// ── Education ────────────────────────────────────────────────────────────
// Each entry renders one institution block. Add new entries to the array
// and they appear in order — no layout changes needed.

export type Education = {
  institution: string;
  degrees: string[];
  period: string;
  note?: string;
};

export const education: Education[] = [
  {
    institution: 'Indian Institute of Technology Madras',
    degrees: [
      'Integrated M.Tech. in Data Science',
      'B.Tech. in Engineering Physics, minor in Economics',
    ],
    period: '2017–2022',
    note: 'Exchange semester at Université Paris-Saclay as a Charpak Scholar.',
  },
];
