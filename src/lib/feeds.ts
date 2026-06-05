// src/lib/feeds.ts
// Static feed configuration: topicId → array of RSS feed URLs.
// Google News RSS provides broad topic coverage.
// Curated feeds (marked TODO) should be replaced by Houtan with real Substack/RSS URLs.

export interface FeedConfig {
  topicId: number;
  label: string;
  urls: string[];
}

function googleNewsRss(keywords: string): string {
  const q = encodeURIComponent(`${keywords} when:7d`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

export const FEEDS: Record<number, FeedConfig> = {
  1: {
    topicId: 1,
    label: "Founder psychology",
    urls: [
      googleNewsRss("founder psychology startup mental health"),
      googleNewsRss("entrepreneurship founder wellbeing burnout"),
      // TODO: add curated Substack/RSS URL for founder psychology
    ],
  },
  2: {
    topicId: 2,
    label: "Education as a design problem",
    urls: [
      googleNewsRss("education design impact learning outcomes"),
      googleNewsRss("edtech market validation learning effectiveness"),
      "https://edsheet.whiteboardadvisors.com", // Whiteboard Advisors edtech market intelligence
      // TODO: add curated Substack/RSS URL for education design
    ],
  },
  3: {
    topicId: 3,
    label: "Archaeology of institutions",
    urls: [
      googleNewsRss("institutions organizational behavior bureaucracy design"),
      googleNewsRss("institutional change nonprofit university reform"),
      // TODO: add curated Substack/RSS URL for institutional analysis
    ],
  },
  4: {
    topicId: 4,
    label: "AI in education",
    urls: [
      googleNewsRss("AI education evidence research learning"),
      googleNewsRss("artificial intelligence teaching edtech outcomes study"),
      // TODO: add curated Substack/RSS URL for AI in education research
    ],
  },
  5: {
    topicId: 5,
    label: "Founder as translator",
    urls: [
      googleNewsRss("startup communication strategy uncertainty founder"),
      googleNewsRss("product strategy vision execution founder decision"),
      // TODO: add curated Substack/RSS URL for founder strategy
    ],
  },
  6: {
    topicId: 6,
    label: "Scale and intimacy",
    urls: [
      googleNewsRss("community small group intimacy scale impact"),
      googleNewsRss("intimate learning cohort small group education"),
      // TODO: add curated Substack/RSS URL for scale and intimacy
    ],
  },
  7: {
    topicId: 7,
    label: "Gap between proof and belief",
    urls: [
      googleNewsRss("evidence policy belief conviction decision making"),
      googleNewsRss("research evidence gap belief behavior change"),
      // TODO: add curated Substack/RSS URL for evidence and belief
    ],
  },
};

// All topic IDs, for iteration in poll-feeds.ts
export const TOPIC_IDS = Object.keys(FEEDS).map(Number);
