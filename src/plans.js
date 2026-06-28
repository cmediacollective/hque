// Single source of truth for subscription tiers.
// Used by the pricing page, in-app Billing, the trial-ended UpgradeWall, the
// landing page, and the limit-enforcement helpers. Keep promises here only.
//
// Internal key 'agency' is the Business tier (kept for Stripe/code compatibility).

export const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER,
    description: 'For entrepreneurs and small teams who need a clean, simple way to manage talent and run campaigns.',
    features: [
      'Up to 50 talent',
      '2 team members',
      'Talent roster management',
      'Campaign tracking & outreach',
      'Talent inquiry form',
      'Workspace & task management',
      'Payment tracking',
      'Branded login page',
      'Email support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$99',
    period: '/month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO,
    recommended: true,
    description: 'For agencies and brand teams scaling their campaigns and ready for deeper analytics and workflows.',
    features: [
      'Everything in Starter',
      'Unlimited talent',
      '5 team members',
      'Reports & analytics',
      'Priority support',
    ],
  },
  {
    key: 'agency',
    name: 'Business',
    price: '$199',
    period: '/month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_AGENCY,
    description: 'For established agencies and brands running high-volume talent operations across multiple campaigns and clients.',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Full white-label branding',
      'Custom onboarding',
      'Dedicated account support',
      'Early access to new features',
    ],
  },
]

// Feature-by-feature comparison for the pricing page table.
// Values: true (included), false (not included), or a string (e.g. a number/label).
export const COMPARE = [
  { label: 'Talent / creators', starter: 'Up to 50', pro: 'Unlimited', agency: 'Unlimited' },
  { label: 'Team members', starter: '2', pro: '5', agency: 'Unlimited' },
  { label: 'Talent roster management', starter: true, pro: true, agency: true },
  { label: 'Campaign tracking & outreach', starter: true, pro: true, agency: true },
  { label: 'Talent inquiry form', starter: true, pro: true, agency: true },
  { label: 'Workspace & task management', starter: true, pro: true, agency: true },
  { label: 'Payment tracking', starter: true, pro: true, agency: true },
  { label: 'Branded login page', starter: true, pro: true, agency: true },
  { label: 'Reports & analytics', starter: false, pro: true, agency: true },
  { label: 'Full white-label branding', starter: false, pro: false, agency: true },
  { label: 'Custom onboarding', starter: false, pro: false, agency: true },
  { label: 'Early access to new features', starter: false, pro: false, agency: true },
  { label: 'Support', starter: 'Email', pro: 'Priority', agency: 'Dedicated' },
]

// Per-plan hard limits, keyed by organizations.stripe_plan.
// null (trial) and anything unrecognized get full access — trials are unrestricted.
export function planLimits(stripePlan) {
  if (stripePlan === 'starter') return { talent: 50, seats: 2, reports: false }
  if (stripePlan === 'pro') return { talent: Infinity, seats: 5, reports: true }
  return { talent: Infinity, seats: Infinity, reports: true }
}
