// Single source of truth for the FAQ questions & answers.
// Used by the FAQ page (src/FAQPage.jsx) AND the prerender/SEO build step
// (scripts/prerender.mjs) so the crawlable HTML and FAQPage JSON-LD can never
// drift from what visitors actually see. Answers are plain text; URLs/emails in
// them are turned into links by <Linkify> on the page.
export const FAQS = [
  { q: 'What is HQue?', a: 'HQue is an operating system for talent agencies and brands built on talent partnerships. It replaces spreadsheets, email threads, and disconnected tools with one platform for managing your roster, campaigns, payments, and team.' },
  { q: 'Who is HQue for?', a: 'HQue is built for influencer marketing agencies, talent management companies, and brand partnerships teams. If you manage a roster of creators or public figures and run campaigns on their behalf, HQue was made for you.' },
  { q: 'How is HQue different from Monday.com or a spreadsheet?', a: 'Spreadsheets break quickly. Monday.com is generic — it has no concept of talent, campaigns, or brand partnerships. HQue is purpose-built for the way agencies actually work.' },
  { q: 'Can multiple team members use HQue?', a: 'Yes. All plans include multiple team members. Starter includes 2 seats, Pro includes 5, and Business includes unlimited seats.' },
  { q: 'Is there a free trial?', a: "Yes — every plan starts with a 14-day free trial. No credit card required. You'll have full access to all features during your trial." },
  { q: 'What happens after my trial ends?', a: "You'll be prompted to choose a plan to continue. Your data is never deleted — if you need more time, reach out to us at support@h-que.com." },
  { q: 'Can I cancel anytime?', a: "Yes. No long-term contracts. Cancel anytime from your billing settings and you'll retain access until the end of your billing period." },
  { q: 'Do you offer discounts for smaller agencies?', a: 'We built the Starter plan at $49/month specifically for smaller teams.' },
  { q: "Where can I see what's new, what's been fixed, and what's coming next?", a: "We keep a live product updates page at https://h-que.com/updates. It shows everything that's been shipped (new features, improvements, and bug fixes), what we're currently building, and what's planned. You can also submit your own feature requests or report an issue directly from that page." },
]
