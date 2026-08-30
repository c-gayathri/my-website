// ── Research projects ────────────────────────────────────────────────────
// Everything in the "Research Projects" panel comes from this file.
// Projects render in LIST ORDER — put the most important one first.
//
//   venues → workshop / conference lines under the title. Add as many as
//            you like; `href` is optional and turns the name into a link.
//   links  → optional row of named links (Paper, Code, Slides, …). They
//            only render when present — currently none are shown. To add
//            them back for a project, give it a `links` array:
//              links: [{ label: 'Paper', href: 'https://…' }]
//   description → one or more paragraphs.

export type Venue = {
  name: string;
  href?: string;
};

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  title: string;
  period: string;
  affiliation?: string;
  venues?: Venue[];
  description: string[];
  links?: ProjectLink[];
};

export const projects: Project[] = [
  {
    title:
      'The Role of Preference Data and Unembeddings in the Convergence Rate of DPO',
    period: '2024–2025',
    affiliation: 'Indian Institute of Science · Advisor: Prof. Anand Louis',
    venues: [
      {
        name: 'ARLET Workshop, NeurIPS 2025',
        href: 'https://neurips.cc/virtual/2025/loc/san-diego/136118',
      },
    ],
    description: [
      'I studied the optimisation dynamics of Direct Preference Optimisation for large language models under a simplified, architecture-motivated linear parameterisation. We establish linear convergence of gradient descent by characterising the Polyak–Łojasiewicz condition and smoothness of the DPO objective.',
      'The results lead to concrete data-collection strategies: selecting prompts and comparisons that yield a well-conditioned embedding matrix and a low spectral ratio in the Laplacian of the comparison graph. We verify this on synthetic data and by instruction-tuning GPT-2 on the safe-RLHF dataset, and establish high-probability guarantees for maximum-likelihood estimation under the Bradley–Terry model, relating parameter-estimation error to the conditioning of the collected data.',
    ],
  },
  {
    title: 'Mitigating Harmful Content in LLMs',
    period: '2025',
    affiliation: 'AI4Bharat, IIT Madras · Prof. Mitesh Khapra',
    description: [
      'I worked on adapting LLM safety frameworks to the Indian context. After surveying global approaches to harm mitigation, I helped develop an India-specific harm taxonomy and annotation framework, and contributed to policy recommendations for incorporating local safety considerations into large language models.',
    ],
  },
  {
    title: 'Fair Influence Maximisation in Partially Observed Social Networks',
    period: '2021–2022',
    affiliation: "Master's Thesis, IIT Madras · Prof. Balaraman Ravindran",
    description: [
      'I studied fair influence maximisation when the underlying social network is only partially observed. I implemented a geometric deep Q-learning approach for sequential network discovery, incorporated welfare-based notions of fairness into the reward formulation, and worked on approximation guarantees for a greedy network-discovery heuristic through submodularity.',
    ],
  },
  {
    title: 'NLP for Social Good',
    period: '2021',
    affiliation: 'Nanyang Technological University · Prof. Erik Cambria',
    description: [
      'I analysed climate-change discourse using natural language processing, including topic modelling and aspect-based sentiment analysis of climate-related social-media data.',
    ],
  },
  {
    title: 'Quantum Reinforcement Learning',
    period: '2020',
    affiliation: 'Adobe Research',
    description: [
      'I explored quantum approaches to reinforcement learning, focusing on the use of quantum annealing to recover optimal policies for Markov decision processes. I developed a more storage-efficient Hamiltonian encoding that reduced the representation of the action space from |A| to log |A|, and implemented simulations using D-Wave tools.',
    ],
  },
];
