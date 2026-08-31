import type { Experiment, SeedRun } from './types'

// ---------------------------------------------------------------------------
// Worked examples, written by hand and seeded into the database on first boot
// so the app is never an empty shell. They are illustrative, not measured: the
// scores and costs here did not come from a real run.
// ---------------------------------------------------------------------------

export const EXAMPLE_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-landing',
    title: 'Meridian landing page',
    type: 'code',
    templateId: 'tpl-landing',
    prompt:
      'Build a single-page landing site for a fictional time-tracking tool called Meridian. It needs a hero with a headline and one call to action, a three-column feature section, and a footer. Plain HTML, CSS and JavaScript only — no build step and no external dependencies. Make it look considered rather than templated.',
    modelIds: ['claude-opus-4.8', 'gpt-5.6-luna-pro', 'gemini-3.1-pro'],
    createdAt: '2026-08-19T09:12:00Z',
    updatedAt: '2026-08-26T16:40:00Z',
  },
  {
    id: 'exp-launch-post',
    title: 'Focus feature announcement',
    type: 'content',
    templateId: 'tpl-launch-post',
    prompt:
      'Write a launch announcement for Meridian Focus, a feature that automatically groups tracked time into projects without the user tagging anything. Around 400 words, for an audience of freelance designers. No exclamation marks, no "we are excited to announce", and no invented statistics.',
    modelIds: ['claude-opus-4.8', 'gpt-5.6-luna-pro', 'deepseek-v3.2'],
    createdAt: '2026-08-21T11:02:00Z',
    updatedAt: '2026-08-25T10:15:00Z',
  },
  {
    id: 'exp-spot',
    title: 'Fifteen-second product spot',
    type: 'video',
    templateId: 'tpl-product-spot',
    prompt:
      'A fifteen-second spot for a time-tracking app. Open on a cluttered desk at dusk, push in slowly on a laptop showing a clean weekly timesheet, then pull back to reveal the desk now tidy and the room dark except for one lamp. Warm, unhurried, no on-screen text, no people speaking.',
    modelIds: ['veo-3', 'sora-2', 'hailuo-02', 'kling-2-5-turbo'],
    createdAt: '2026-08-24T14:30:00Z',
    updatedAt: '2026-08-27T08:05:00Z',
  },
  {
    id: 'exp-packaging',
    title: 'Legible text in packaging shot',
    type: 'image',
    templateId: 'tpl-text-in-image',
    prompt:
      'A clean product packaging mockup: a matte white box on a grey seamless background, with the word "MERIDIAN" printed in a precise geometric sans-serif across the front, correctly spelled and evenly spaced. Studio lighting, soft shadow.',
    modelIds: ['gemini-3-pro-image', 'gpt-5-image', 'gpt-5.4-image-2'],
    createdAt: '2026-08-25T16:44:00Z',
    updatedAt: '2026-08-25T16:52:00Z',
  },
  {
    id: 'exp-csv',
    title: 'CSV median edge cases',
    type: 'code',
    templateId: 'tpl-bugfix',
    prompt:
      'Write a Node script that reads a CSV from stdin and prints the median of a numeric column named "value". It must handle blank lines, quoted fields containing commas, and rows where the value is not a number. Write your own test cases and iterate until they all pass.',
    modelIds: ['claude-sonnet-4.6', 'llama-4-maverick'],
    createdAt: '2026-08-26T09:20:00Z',
    updatedAt: '2026-08-26T09:34:00Z',
  },
]

// ---------------------------------------------------------------------------
// Runs. Each run holds one result per model, produced from the same prompt.
// ---------------------------------------------------------------------------

const CODE_RUNS: SeedRun[] = [
  // ======================= exp-landing =======================
  {
    id: 'run-landing-2',
    experimentId: 'exp-landing',
    seq: 2,
    label: 'Run 2',
    startedAt: '2026-08-26T16:40:00Z',
    status: 'complete',
    note: 'Added "make it look considered rather than templated" to the prompt.',
    results: [
      {
        modelId: 'claude-opus-4.8',
        status: 'complete',
        durationSec: 204,
        costUsd: 0.148,
        tokensIn: 322_000,
        tokensOut: 3_297,
        score: 5,
        output: {
          kind: 'code',
          summary:
            'Wrote all three files from scratch, served the folder and checked it rendered before finishing.',
          tests: null,
          files: [
            {
              path: 'index.html',
              language: 'html',
              content: `<main>
  <section class="hero">
    <p class="eyebrow">Time tracking</p>
    <h1>Time tracked without<br />thinking about it.</h1>
    <p class="lede">
      Meridian watches the work you already do and turns it into
      timesheets your finance team will actually accept.
    </p>
    <a class="cta" href="#start">Start tracking free</a>
  </section>

  <section class="features">
    <article>
      <h2>Automatic capture</h2>
      <p>Sessions are recorded as you work. No timers to start or stop.</p>
    </article>
    <article>
      <h2>Honest reports</h2>
      <p>Every hour traces back to a file, a ticket, or a meeting.</p>
    </article>
    <article>
      <h2>Invoice in a click</h2>
      <p>Approved time becomes a draft invoice, ready to send.</p>
    </article>
  </section>
</main>`,
            },
            {
              path: 'styles.css',
              language: 'css',
              content: `:root {
  --ink: #14181d;
  --muted: #5d6673;
  --rule: #e6e9ed;
  --step: clamp(1rem, 0.6rem + 1.4vw, 1.6rem);
}

.hero h1 {
  font-size: clamp(2.4rem, 1.2rem + 4.4vw, 4.2rem);
  line-height: 1.03;
  letter-spacing: -0.035em;
  text-wrap: balance;
  margin: 0 0 var(--step);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: calc(var(--step) * 1.5);
  border-top: 1px solid var(--rule);
  padding-top: calc(var(--step) * 2);
}`,
            },
            {
              path: 'app.js',
              language: 'javascript',
              content: `// The only behaviour this page needs.
const nav = document.querySelector('[data-nav]')
document.querySelector('[data-nav-toggle]')?.addEventListener('click', () => {
  nav.toggleAttribute('data-open')
})`,
            },
          ],
          preview: {
            kind: 'spec' as const,
            theme: 'light',
            brand: 'Meridian',
            headline: 'Time tracked without thinking about it.',
            sub: 'Meridian watches the work you already do and turns it into timesheets your finance team will actually accept.',
            cta: 'Start tracking free',
            layout: 'stacked',
            blocks: [
              { title: 'Automatic capture', body: 'Sessions are recorded as you work. No timers to start or stop.' },
              { title: 'Honest reports', body: 'Every hour traces back to a file, a ticket, or a meeting.' },
              { title: 'Invoice in a click', body: 'Approved time becomes a draft invoice, ready to send.' },
            ],
          },
        },
      },
      {
        modelId: 'gpt-5.6-luna-pro',
        status: 'complete',
        durationSec: 302,
        costUsd: null,
        tokensIn: 198_400,
        tokensOut: 2_610,
        score: 4,
        output: {
          kind: 'code',
          summary:
            'Patched the three existing files. Used a serif display face for contrast; never opened the page to look at it.',
          tests: null,
          files: [
            {
              path: 'index.html',
              language: 'html',
              content: `<header class="bar">
  <span class="mark">MERIDIAN</span>
  <nav><a href="#product">Product</a><a href="#docs">Docs</a></nav>
  <a class="btn" href="#signup">Get started</a>
</header>

<section class="hero">
  <h1>Every hour, accounted for.</h1>
  <p>A time tracker for teams that bill by the hour and hate
     filling in timesheets on Friday afternoon.</p>
  <a class="btn btn-lg" href="#signup">Create an account</a>
</section>`,
            },
            {
              path: 'styles.css',
              language: 'css',
              content: `.hero h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 3.5rem;
  letter-spacing: -0.02em;
  max-width: 14ch;
}

.btn {
  background: #1d4ed8;
  color: #fff;
  border-radius: 8px;
  padding: 0.8rem 1.6rem;
}

@media (max-width: 700px) {
  .features { grid-template-columns: 1fr; }
}`,
            },
            {
              path: 'app.js',
              language: 'javascript',
              content: `document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault()
    document.querySelector(a.hash)?.scrollIntoView({ behavior: 'smooth' })
  })
})`,
            },
          ],
          preview: {
            kind: 'spec' as const,
            theme: 'brand',
            brand: 'MERIDIAN',
            headline: 'Every hour, accounted for.',
            sub: 'A time tracker for teams that bill by the hour and hate filling in timesheets on Friday afternoon.',
            cta: 'Create an account',
            layout: 'split',
            blocks: [
              { title: 'One-click timers', body: 'Start and stop from anywhere, including the keyboard.' },
              { title: 'Team dashboards', body: 'See where the week went, per person and per project.' },
              { title: 'Exports', body: 'CSV and PDF that your accounting software will take.' },
            ],
          },
        },
      },
      {
        modelId: 'gemini-3.1-pro',
        status: 'complete',
        durationSec: 168,
        costUsd: 0.061,
        tokensIn: 141_900,
        tokensOut: 4_120,
        score: 2,
        output: {
          kind: 'code',
          summary:
            'Produced a complete structure quickly but left placeholder copy in the feature section.',
          tests: null,
          files: [
            {
              path: 'index.html',
              language: 'html',
              content: `<section class="hero">
  <h1>Meridian</h1>
  <p>Time tracking for teams.</p>
  <button class="cta">Sign up</button>
</section>

<section class="features">
  <div class="card"><h3>Feature one</h3><p>Description to follow.</p></div>
  <div class="card"><h3>Feature two</h3><p>Description to follow.</p></div>
  <div class="card"><h3>Feature three</h3><p>Description to follow.</p></div>
</section>`,
            },
            {
              path: 'styles.css',
              language: 'css',
              content: `body { font-family: system-ui, sans-serif; margin: 0; }
.hero { padding: 6rem 2rem; text-align: center; }
.features { display: flex; gap: 2rem; padding: 0 2rem 4rem; }
.card { flex: 1; padding: 1.5rem; border: 1px solid #ddd; border-radius: 8px; }`,
            },
          ],
          preview: {
            kind: 'spec' as const,
            theme: 'light',
            brand: 'Meridian',
            headline: 'Meridian',
            sub: 'Time tracking for teams.',
            cta: 'Sign up',
            layout: 'grid',
            blocks: [
              { title: 'Feature one', body: 'Description to follow.' },
              { title: 'Feature two', body: 'Description to follow.' },
              { title: 'Feature three', body: 'Description to follow.' },
            ],
          },
        },
      },
    ],
  },
  {
    id: 'run-landing-1',
    experimentId: 'exp-landing',
    seq: 1,
    label: 'Run 1',
    startedAt: '2026-08-19T09:12:00Z',
    status: 'complete',
    note: null,
    results: [
      {
        modelId: 'claude-opus-4.8',
        status: 'complete',
        durationSec: 187,
        costUsd: 0.131,
        tokensIn: 288_000,
        tokensOut: 2_940,
        score: 4,
        output: {
          kind: 'code',
          summary: 'Clean structure, but the copy stayed generic without the extra instruction.',
          tests: null,
          files: [
            {
              path: 'index.html',
              language: 'html',
              content: `<section class="hero">
  <h1>Track time without the timesheet</h1>
  <p>Meridian records the work you do and turns it into billable hours.</p>
  <a class="cta" href="#start">Get started</a>
</section>`,
            },
          ],
          preview: {
            kind: 'spec' as const,
            theme: 'light',
            brand: 'Meridian',
            headline: 'Track time without the timesheet',
            sub: 'Meridian records the work you do and turns it into billable hours.',
            cta: 'Get started',
            layout: 'stacked',
            blocks: [
              { title: 'Automatic', body: 'No timers to remember.' },
              { title: 'Accurate', body: 'Every hour is traceable.' },
              { title: 'Fast invoicing', body: 'Approved time becomes an invoice.' },
            ],
          },
        },
      },
      {
        modelId: 'gpt-5.6-luna-pro',
        status: 'complete',
        durationSec: 251,
        costUsd: null,
        tokensIn: 176_200,
        tokensOut: 2_180,
        score: 3,
        output: {
          kind: 'code',
          summary: 'Solid markup, default styling, no attempt at a visual point of view.',
          tests: null,
          files: [
            {
              path: 'index.html',
              language: 'html',
              content: `<div class="container">
  <h1>Meridian &mdash; Time Tracking</h1>
  <p>The easiest way to track your time.</p>
  <button>Sign Up Free</button>
</div>`,
            },
          ],
          preview: {
            kind: 'spec' as const,
            theme: 'light',
            brand: 'Meridian',
            headline: 'Meridian — Time Tracking',
            sub: 'The easiest way to track your time.',
            cta: 'Sign Up Free',
            layout: 'stacked',
            blocks: [
              { title: 'Simple', body: 'Easy to use interface.' },
              { title: 'Powerful', body: 'Reports and analytics.' },
              { title: 'Affordable', body: 'Plans for every team.' },
            ],
          },
        },
      },
      {
        modelId: 'gemini-3.1-pro',
        status: 'complete',
        durationSec: 143,
        costUsd: 0.052,
        tokensIn: 132_100,
        tokensOut: 3_610,
        score: 2,
        output: {
          kind: 'code',
          summary: 'Same placeholder problem as run 2 — the copy instruction did not change this.',
          tests: null,
          files: [
            { path: 'index.html', language: 'html', content: `<h1>Meridian</h1>\n<p>Time tracking for teams.</p>` },
          ],
          preview: {
            kind: 'spec' as const,
            theme: 'light',
            brand: 'Meridian',
            headline: 'Meridian',
            sub: 'Time tracking for teams.',
            cta: 'Sign up',
            layout: 'grid',
            blocks: [
              { title: 'Feature one', body: 'Lorem ipsum placeholder.' },
              { title: 'Feature two', body: 'Lorem ipsum placeholder.' },
              { title: 'Feature three', body: 'Lorem ipsum placeholder.' },
            ],
          },
        },
      },
    ],
  },
]

const MEDIA_RUNS: SeedRun[] = [
  // ======================= exp-launch-post =======================
  {
    id: 'run-post-1',
    experimentId: 'exp-launch-post',
    seq: 1,
    label: 'Run 1',
    startedAt: '2026-08-25T10:15:00Z',
    status: 'complete',
    note: null,
    results: [
      {
        modelId: 'claude-opus-4.8',
        status: 'complete',
        durationSec: 41,
        costUsd: 0.038,
        tokensIn: 1_240,
        tokensOut: 640,
        score: 5,
        output: {
          kind: 'content',
          summary: 'Held the constraints, led with the reader rather than the feature.',
          title: 'Your time, already sorted',
          deck: 'Meridian Focus groups your tracked hours into projects on its own. Nothing to tag, nothing to tidy on Friday.',
          wordCount: 412,
          readingMinutes: 2,
          tone: 'Plain, second person, no hype',
          sections: [
            {
              heading: null,
              paragraphs: [
                'If you bill by the hour, you already know the Friday ritual. You open a week of untagged time entries and try to remember which of them was the rebrand and which was the pitch deck. The tracking was easy. The sorting is what you put off.',
                'Meridian Focus removes the sorting. It reads the signals already sitting in your tracked time — the files you opened, the tabs you kept returning to, who was in the calendar invite — and groups the week into projects for you.',
              ],
            },
            {
              heading: 'How it decides',
              paragraphs: [
                'Focus looks for clusters rather than keywords. Two hours in the same set of documents, followed by a call with the same three people, followed by more time in those documents, is one piece of work even when nothing shares a name.',
                'When it is not sure, it says so. Ambiguous blocks arrive in a short review list rather than being filed silently into the wrong project, because a confident wrong answer costs you more than a question.',
              ],
            },
            {
              heading: 'What it does not do',
              paragraphs: [
                'Focus does not read the contents of your documents, and it does not send anything to a third party. The grouping runs against metadata: file paths, window titles, calendar attendees, and timing.',
                'It also does not overwrite you. Any grouping you change by hand stays changed, and Focus treats that correction as a signal for the next week rather than something to undo.',
              ],
            },
            {
              heading: 'Getting it',
              paragraphs: [
                'Focus is on for every Meridian account from today. Your last four weeks have already been grouped, so you can open the app and check its work against a period you remember.',
                'If the grouping is wrong, the fastest thing you can do is correct one week and leave it. That is the whole setup.',
              ],
            },
          ],
        },
      },
      {
        modelId: 'gpt-5.6-luna-pro',
        status: 'complete',
        durationSec: 33,
        costUsd: null,
        tokensIn: 1_240,
        tokensOut: 590,
        score: 3,
        output: {
          kind: 'content',
          summary: 'Well-organised, but drifted into the launch-copy register the brief ruled out.',
          title: 'Introducing Meridian Focus',
          deck: 'Automatic project grouping is here. Say goodbye to manual tagging forever.',
          wordCount: 388,
          readingMinutes: 2,
          tone: 'Upbeat marketing',
          sections: [
            {
              heading: null,
              paragraphs: [
                'Today we are introducing Meridian Focus, a powerful new feature that automatically groups your tracked time into projects — no tagging required.',
                'For freelance designers juggling multiple clients, keeping time organised has always been a chore. Focus changes that.',
              ],
            },
            {
              heading: 'Smarter grouping',
              paragraphs: [
                'Focus uses advanced signals from your workflow to understand which work belongs together. It learns as you go, becoming more accurate over time.',
                'The result is a timesheet that organises itself while you focus on the work that matters.',
              ],
            },
            {
              heading: 'Privacy first',
              paragraphs: [
                'Focus only looks at metadata, never the contents of your files. Your work stays yours.',
              ],
            },
            {
              heading: 'Available today',
              paragraphs: [
                'Focus is rolling out to all Meridian accounts starting today. Log in to see your last four weeks already grouped and ready to review.',
              ],
            },
          ],
        },
      },
      {
        modelId: 'deepseek-v3.2',
        status: 'complete',
        durationSec: 28,
        costUsd: 0.004,
        tokensIn: 1_240,
        tokensOut: 720,
        score: 2,
        output: {
          kind: 'content',
          summary: 'Broke two explicit constraints: invented a statistic and used an exclamation mark.',
          title: 'Meridian Focus: Time Tracking That Thinks For You!',
          deck: 'Our new AI-powered feature saves designers an average of 4.5 hours per month.',
          wordCount: 441,
          readingMinutes: 2,
          tone: 'Promotional',
          sections: [
            {
              heading: null,
              paragraphs: [
                'We are excited to announce Meridian Focus, the biggest update to our platform yet! Freelance designers now save an average of 4.5 hours per month on administrative work.',
                'Focus automatically groups your tracked time into projects using state-of-the-art machine learning.',
              ],
            },
            {
              heading: 'Key benefits',
              paragraphs: [
                'No more manual tagging. No more Friday afternoon cleanup. Studies show that context-switching costs knowledge workers up to 23 minutes per interruption.',
                'With Focus, your timesheet is always ready when you are.',
              ],
            },
          ],
        },
      },
    ],
  },

  // ======================= exp-spot (video) =======================
  {
    id: 'run-spot-2',
    experimentId: 'exp-spot',
    seq: 2,
    label: 'Run 2',
    startedAt: '2026-08-27T08:05:00Z',
    status: 'running',
    note: 'Added Kling 2.5 to the comparison.',
    results: [
      {
        modelId: 'veo-3',
        status: 'complete',
        durationSec: 214,
        costUsd: 1.2,
        tokensIn: 0,
        tokensOut: 0,
        score: null,
        output: {
          kind: 'video',
          summary: 'Held the three-beat structure and kept the lamp as the single light source throughout.',
          durationSec: 15,
          resolution: '1920×1080',
          fps: 24,
          aspect: '16:9',
          poster: ['#3b2a1d', '#c78a4a'],
          audio: 'Ambient room tone, low synth pad',
          shots: [
            { at: 0, description: 'Wide on a cluttered desk, last daylight through a window behind.' },
            { at: 5, description: 'Slow push in on the laptop; the weekly timesheet resolves into focus.' },
            { at: 10, description: 'Pull back. Desk clear, room dark, one lamp still on.' },
          ],
        },
      },
      {
        modelId: 'sora-2',
        status: 'complete',
        durationSec: 268,
        costUsd: 1.5,
        tokensIn: 0,
        tokensOut: 0,
        score: null,
        output: {
          kind: 'video',
          summary: 'Strongest physical continuity — objects that leave frame return in the same place.',
          durationSec: 15,
          resolution: '1920×1080',
          fps: 30,
          aspect: '16:9',
          poster: ['#1d2b3b', '#7fa8c9'],
          audio: 'None',
          shots: [
            { at: 0, description: 'Desk at dusk, cooler grade than the brief suggested.' },
            { at: 6, description: 'Push in; screen legible, rows of the timesheet readable.' },
            { at: 11, description: 'Pull back to the tidy desk; lamp warm against a blue room.' },
          ],
        },
      },
      {
        modelId: 'hailuo-02',
        status: 'running',
        durationSec: 96,
        costUsd: null,
        tokensIn: 0,
        tokensOut: 0,
        score: null,
        output: {
          kind: 'video',
          summary: 'Generating — 2 of 3 shots rendered.',
          durationSec: 15,
          resolution: '1280×720',
          fps: 24,
          aspect: '16:9',
          poster: ['#2b1d3b', '#a97fc9'],
          audio: null,
          shots: [
            { at: 0, description: 'Desk at dusk.' },
            { at: 5, description: 'Push in on laptop.' },
          ],
        },
      },
      {
        modelId: 'kling-2-5-turbo',
        status: 'failed',
        durationSec: 12,
        costUsd: 0,
        tokensIn: 0,
        tokensOut: 0,
        score: null,
        error: 'Prompt rejected: the safety filter flagged "push in slowly on a laptop" as a device close-up.',
        output: {
          kind: 'video',
          summary: 'No clip produced.',
          durationSec: 0,
          resolution: '—',
          fps: 0,
          aspect: '16:9',
          poster: ['#2a2a2a', '#4a4a4a'],
          audio: null,
          shots: [],
        },
      },
    ],
  },
  {
    id: 'run-spot-1',
    experimentId: 'exp-spot',
    seq: 1,
    label: 'Run 1',
    startedAt: '2026-08-24T14:30:00Z',
    status: 'complete',
    note: null,
    results: [
      {
        modelId: 'veo-3',
        status: 'complete',
        durationSec: 198,
        costUsd: 1.2,
        tokensIn: 0,
        tokensOut: 0,
        score: 4,
        output: {
          kind: 'video',
          summary: 'Good motion, but cut to a second angle instead of holding one continuous move.',
          durationSec: 15,
          resolution: '1920×1080',
          fps: 24,
          aspect: '16:9',
          poster: ['#3b2a1d', '#b87f45'],
          audio: 'Ambient room tone',
          shots: [
            { at: 0, description: 'Desk at dusk, papers scattered.' },
            { at: 7, description: 'Hard cut to a closer angle on the laptop.' },
            { at: 12, description: 'Wide again, desk tidy.' },
          ],
        },
      },
      {
        modelId: 'sora-2',
        status: 'complete',
        durationSec: 245,
        costUsd: 1.5,
        tokensIn: 0,
        tokensOut: 0,
        score: 5,
        output: {
          kind: 'video',
          summary: 'One unbroken move, exactly as briefed.',
          durationSec: 15,
          resolution: '1920×1080',
          fps: 30,
          aspect: '16:9',
          poster: ['#1d2b3b', '#6f98b9'],
          audio: 'None',
          shots: [
            { at: 0, description: 'Desk at dusk.' },
            { at: 5, description: 'Continuous push in on the screen.' },
            { at: 10, description: 'Continuous pull back, room now dark.' },
          ],
        },
      },
      {
        modelId: 'hailuo-02',
        status: 'complete',
        durationSec: 176,
        costUsd: 0.9,
        tokensIn: 0,
        tokensOut: 0,
        score: 3,
        output: {
          kind: 'video',
          summary: 'Camera move is right but the desk never visibly tidies between beats.',
          durationSec: 15,
          resolution: '1280×720',
          fps: 24,
          aspect: '16:9',
          poster: ['#2b1d3b', '#9a7fc0'],
          audio: null,
          shots: [
            { at: 0, description: 'Desk at dusk, moderate clutter.' },
            { at: 6, description: 'Push in; screen content is illegible.' },
            { at: 11, description: 'Pull back; clutter unchanged.' },
          ],
        },
      },
    ],
  },

  // ======================= exp-packaging (image) =======================
  {
    id: 'run-pack-1',
    experimentId: 'exp-packaging',
    seq: 1,
    label: 'Run 1',
    startedAt: '2026-08-25T16:52:00Z',
    status: 'complete',
    note: null,
    results: [
      {
        modelId: 'gemini-3-pro-image',
        status: 'complete',
        durationSec: 22,
        costUsd: 0.13,
        tokensIn: 0,
        tokensOut: 0,
        score: 5,
        output: {
          kind: 'image',
          summary: 'Spelled the word correctly in all four variations, with even letter spacing.',
          size: '2048×2048',
          images: [
            { gradient: ['#f4f4f2', '#dcdcd8', '#b9b9b4'], caption: 'MERIDIAN — correct, centred', seed: '81f3a2' },
            { gradient: ['#efefec', '#d4d4cf', '#adadaa'], caption: 'MERIDIAN — correct, lower third', seed: '81f3a3' },
            { gradient: ['#f7f6f4', '#e0dfda', '#bcbcb6'], caption: 'MERIDIAN — correct, embossed', seed: '81f3a4' },
            { gradient: ['#eceae7', '#cfcdc8', '#a8a6a1'], caption: 'MERIDIAN — correct, side angle', seed: '81f3a5' },
          ],
        },
      },
      {
        modelId: 'gpt-5-image',
        status: 'complete',
        durationSec: 31,
        costUsd: 0.17,
        tokensIn: 0,
        tokensOut: 0,
        score: 3,
        output: {
          kind: 'image',
          summary: 'Three of four spelled correctly; one rendered "MERIDLAN".',
          size: '1536×1536',
          images: [
            { gradient: ['#f2f1ef', '#d8d7d3', '#b2b1ad'], caption: 'MERIDIAN — correct', seed: '4c19bb' },
            { gradient: ['#eeece9', '#d2d0cb', '#aaa8a3'], caption: 'MERIDLAN — misspelled', seed: '4c19bc' },
            { gradient: ['#f5f4f1', '#dbdad5', '#b5b4af'], caption: 'MERIDIAN — correct, tight crop', seed: '4c19bd' },
            { gradient: ['#e9e7e4', '#cdcbc6', '#a5a39e'], caption: 'MERIDIAN — correct, soft shadow', seed: '4c19be' },
          ],
        },
      },
      {
        modelId: 'gpt-5.4-image-2',
        status: 'complete',
        durationSec: 18,
        costUsd: 0.05,
        tokensIn: 0,
        tokensOut: 0,
        score: 2,
        output: {
          kind: 'image',
          summary: 'Best material rendering of the three, worst typography — none of the four are readable.',
          size: '1440×1440',
          images: [
            { gradient: ['#f0efec', '#d6d5d0', '#aeaca7'], caption: 'MERIDIAИ — reversed glyph', seed: 'a70d51' },
            { gradient: ['#edecea', '#d1d0cb', '#a9a7a2'], caption: 'MERIOIAN — misspelled', seed: 'a70d52' },
            { gradient: ['#f3f2ef', '#d9d8d3', '#b3b2ad'], caption: 'MERIDIAN — letters uneven', seed: 'a70d53' },
            { gradient: ['#eae8e5', '#ceccc7', '#a6a49f'], caption: 'MEBIDIAN — misspelled', seed: 'a70d54' },
          ],
        },
      },
    ],
  },

  // ======================= exp-csv =======================
  {
    id: 'run-csv-1',
    experimentId: 'exp-csv',
    seq: 1,
    label: 'Run 1',
    startedAt: '2026-08-26T09:34:00Z',
    status: 'complete',
    note: null,
    results: [
      {
        modelId: 'claude-sonnet-4.6',
        status: 'complete',
        durationSec: 88,
        costUsd: 0.042,
        tokensIn: 46_200,
        tokensOut: 1_890,
        score: 5,
        output: {
          kind: 'code',
          summary: 'Wrote 11 cases including the quoted-comma and even-length-median ones, and all pass.',
          tests: { passed: 11, total: 11 },
          files: [
            {
              path: 'median.js',
              language: 'javascript',
              content: `function parseLine(line) {
  const out = []
  let field = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { out.push(field); field = '' }
    else field += ch
  }
  out.push(field)
  return out
}

export function median(rows) {
  const nums = rows
    .map((r) => Number(r.value))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)

  if (nums.length === 0) return null
  const mid = nums.length >> 1
  // Even-length input takes the mean of the two middle values.
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}`,
            },
            {
              path: 'median.test.js',
              language: 'javascript',
              content: `test('quoted field containing a comma', () => {
  const rows = parse('name,value\\n"Smith, J",4\\n"Doe, A",8')
  expect(median(rows)).toBe(6)
})

test('skips rows whose value is not numeric', () => {
  const rows = parse('name,value\\na,1\\nb,n/a\\nc,3')
  expect(median(rows)).toBe(2)
})

test('returns null when nothing is numeric', () => {
  expect(median(parse('name,value\\na,x'))).toBeNull()
})`,
            },
          ],
          preview: null,
        },
      },
      {
        modelId: 'llama-4-maverick',
        status: 'complete',
        durationSec: 71,
        costUsd: null,
        tokensIn: 38_900,
        tokensOut: 1_240,
        score: 2,
        output: {
          kind: 'code',
          summary: 'Split on commas without handling quotes, so one of its own tests fails.',
          tests: { passed: 7, total: 9 },
          files: [
            {
              path: 'median.js',
              language: 'javascript',
              content: `// Note: this splits naively and breaks on quoted fields.
function parseLine(line) {
  return line.split(',')
}

export function median(rows) {
  const nums = rows.map((r) => parseFloat(r.value)).filter((n) => !isNaN(n))
  nums.sort((a, b) => a - b)
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}`,
            },
          ],
          preview: null,
        },
      },
    ],
  },
]

export const EXAMPLE_RUNS: SeedRun[] = [...CODE_RUNS, ...MEDIA_RUNS]
