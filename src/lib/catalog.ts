import type { ExperimentType, Modality, Model, PromptTemplate } from './types'

export const EXPERIMENT_TYPES: ExperimentType[] = [
  {
    id: 'code',
    label: 'Code generation',
    blurb: 'Build or modify something runnable, then look at what each model actually shipped.',
  },
  {
    id: 'content',
    label: 'Content writing',
    blurb: 'Long or short form prose, judged side by side on the same brief.',
  },
  {
    id: 'video',
    label: 'Video generation',
    blurb: 'Text-to-video across model families, compared shot for shot.',
  },
  {
    id: 'image',
    label: 'Image generation',
    blurb: 'One prompt, several image models, the same seed discipline.',
  },
]

function m(
  id: string,
  label: string,
  provider: string,
  providerModel: string,
  modalities: Modality[],
  note: string,
  priceIn?: number,
  priceOut?: number,
): Model {
  return {
    id, label, provider, providerId: 'openrouter', providerModel, modalities, note,
    ...(priceIn != null && priceOut != null ? { price: { in: priceIn, out: priceOut } } : {}),
  }
}

/** Video models, pending a provider integration that can actually run them. */
function v(id: string, label: string, provider: string, providerModel: string, note: string): Model {
  return { id, label, provider, providerId: 'fal', providerModel, modalities: ['video'], note }
}

export const MODELS: Model[] = [
  // Text and code, all reachable through OpenRouter with a single key.
  m('claude-opus-4.8', 'Claude Opus 4.8', 'Anthropic', 'anthropic/claude-opus-4.8', ['code', 'content'], 'Long-horizon agentic work', 5, 25),
  m('claude-sonnet-4.6', 'Claude Sonnet 4.6', 'Anthropic', 'anthropic/claude-sonnet-4.6', ['code', 'content'], 'Fast, capable default', 3, 15),
  m('claude-haiku-4.5', 'Claude Haiku 4.5', 'Anthropic', 'anthropic/claude-haiku-4.5', ['code', 'content'], 'Cheapest of the family', 1, 5),
  m('gpt-5.6-luna-pro', 'GPT-5.6 Luna Pro', 'OpenAI', 'openai/gpt-5.6-luna-pro', ['code', 'content'], 'Strong at patch-style edits', 0.2, 1.2),
  m('gemini-3.1-pro', 'Gemini 3.1 Pro', 'Google', 'google/gemini-3.1-pro-preview', ['code', 'content'], 'Very large context', 2, 12),
  m('gemini-3.7-flash', 'Gemini 3.7 Flash', 'Google', 'google/gemini-3.7-flash', ['code', 'content'], 'Quick and inexpensive', 0.75, 3.75),
  m('grok-4.6', 'Grok 4.6', 'xAI', 'x-ai/grok-4.6', ['code', 'content'], 'Long context, terse style', 2, 6),
  m('deepseek-v3.2', 'DeepSeek V3.2', 'DeepSeek', 'deepseek/deepseek-v3.2', ['code', 'content'], 'Open weight, very cheap', 0.27, 0.4),
  m('kimi-k3', 'Kimi K3', 'Moonshot', 'moonshotai/kimi-k3', ['code', 'content'], 'Open weight, agentic', 3, 15),
  m('qwen3.8-flash', 'Qwen3.8 Flash', 'Alibaba', 'qwen/qwen3.8-flash', ['code', 'content'], 'Open weight, fastest', 0.15, 0.47),
  m('llama-4-maverick', 'Llama 4 Maverick', 'Meta', 'meta-llama/llama-4-maverick', ['code', 'content'], 'Open weight', 0.2, 0.7),
  m('mistral-medium-3.5', 'Mistral Medium 3.5', 'Mistral', 'mistralai/mistral-medium-3-5', ['code', 'content'], 'European, open weight', 1.5, 7.5),

  // Image generation, also via OpenRouter.
  m('gemini-3-pro-image', 'Gemini 3 Pro Image', 'Google', 'google/gemini-3-pro-image', ['image'], 'Nano Banana Pro — text in image'),
  m('gemini-2.5-flash-image', 'Gemini 2.5 Flash Image', 'Google', 'google/gemini-2.5-flash-image', ['image'], 'Fast and cheap'),
  m('gpt-5-image', 'GPT Image', 'OpenAI', 'openai/gpt-5-image', ['image'], 'Instruction following'),
  m('gpt-5.4-image-2', 'GPT Image 2', 'OpenAI', 'openai/gpt-5.4-image-2', ['image'], 'Newer image model'),

  // Video: no shipped integration serves these yet. They are listed so the gap
  // is visible in the UI rather than silently absent — adding a fal.ai or
  // Replicate provider to the registry is what lights the modality up.
  v('veo-3', 'Veo 3', 'Google', 'fal-ai/veo3', 'Native audio, long shots'),
  v('sora-2', 'Sora 2', 'OpenAI', 'fal-ai/sora-2', 'Physical consistency'),
  v('runway-gen4', 'Runway Gen-4', 'Runway', 'fal-ai/runway-gen4/turbo', 'Fine motion control'),
  v('kling-2-5', 'Kling 2.5', 'Kuaishou', 'fal-ai/kling-video/v2.5', 'Fast and inexpensive'),
]

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ---- code -------------------------------------------------------------
  {
    id: 'tpl-landing',
    type: 'code',
    title: 'Landing page from a brief',
    summary: 'A single self-contained page with a hero and feature grid.',
    tags: ['frontend', 'no build step'],
    prompt:
      'Build a single-page landing site for a fictional time-tracking tool called Meridian. It needs a hero with a headline and one call to action, a three-column feature section, and a footer. Plain HTML, CSS and JavaScript only — no build step and no external dependencies. Make it look considered rather than templated.',
  },
  {
    id: 'tpl-refactor',
    type: 'code',
    title: 'Refactor a tangled module',
    summary: 'Restructure without changing behaviour, and prove it with tests.',
    tags: ['refactor', 'tests'],
    prompt:
      'The file cart.js has grown into a 400-line module with mixed concerns. Split it into focused modules, keep the public API identical, and write tests that would fail if behaviour changed. Explain each boundary you drew.',
  },
  {
    id: 'tpl-bugfix',
    type: 'code',
    title: 'Find and fix a real bug',
    summary: 'A failing edge case with no stack trace to lean on.',
    tags: ['debugging'],
    prompt:
      'Write a Node script that reads a CSV from stdin and prints the median of a numeric column named "value". It must handle blank lines, quoted fields containing commas, and rows where the value is not a number. Write your own test cases and iterate until they all pass.',
  },
  // ---- content ----------------------------------------------------------
  {
    id: 'tpl-launch-post',
    type: 'content',
    title: 'Product launch announcement',
    summary: 'Announce a new feature without sounding like a press release.',
    tags: ['marketing', 'short form'],
    prompt:
      'Write a launch announcement for Meridian Focus, a feature that automatically groups tracked time into projects without the user tagging anything. Around 400 words, for an audience of freelance designers. No exclamation marks, no "we are excited to announce", and no invented statistics.',
  },
  {
    id: 'tpl-explainer',
    type: 'content',
    title: 'Technical explainer',
    summary: 'Explain a hard idea to a smart reader who is new to it.',
    tags: ['long form', 'technical'],
    prompt:
      'Explain how vector embeddings let a search engine find results that share no keywords with the query. Assume the reader writes software but has never worked with embeddings. Around 700 words, one worked example, no maths beyond arithmetic.',
  },
  {
    id: 'tpl-rewrite',
    type: 'content',
    title: 'Rewrite for a different reader',
    summary: 'Same facts, a reader who cares about different things.',
    tags: ['editing'],
    prompt:
      'Rewrite the following engineering changelog for a non-technical customer-success team, keeping every fact intact but leading with what changes for the customer: "Migrated the ingestion pipeline from batch to streaming; p99 latency down from 42s to 1.4s; added idempotency keys to the write path."',
  },
  // ---- video ------------------------------------------------------------
  {
    id: 'tpl-product-spot',
    type: 'video',
    title: 'Fifteen-second product spot',
    summary: 'A short brand film with a clear beginning, middle and end.',
    tags: ['advertising', '16:9'],
    prompt:
      'A fifteen-second spot for a time-tracking app. Open on a cluttered desk at dusk, push in slowly on a laptop showing a clean weekly timesheet, then pull back to reveal the desk now tidy and the room dark except for one lamp. Warm, unhurried, no on-screen text, no people speaking.',
  },
  {
    id: 'tpl-nature',
    type: 'video',
    title: 'Physical realism test',
    summary: 'Water, cloth and shadow — where video models usually fail.',
    tags: ['benchmark', 'physics'],
    prompt:
      'A single unbroken shot: a linen curtain lifts in a breeze beside an open window, sunlight moving across a wooden floor, dust visible in the light. The camera does not move. Ten seconds, natural light only.',
  },
  {
    id: 'tpl-explainer-video',
    type: 'video',
    title: 'Vertical social cut',
    summary: 'Fast, legible, built for a phone held upright.',
    tags: ['social', '9:16'],
    prompt:
      'A vertical eight-second clip: overhead shot of hands sorting scattered paper receipts into three neat stacks on a pale table, quick and rhythmic, shallow depth of field, bright daylight.',
  },
  // ---- image ------------------------------------------------------------
  {
    id: 'tpl-hero-image',
    type: 'image',
    title: 'Marketing hero image',
    summary: 'The picture that sits behind a headline.',
    tags: ['marketing', '16:9'],
    prompt:
      'A wide photograph of an empty designer studio in early morning light: a long wooden desk, one anglepoise lamp, a laptop closed, a cold cup of coffee. Muted palette, natural window light from the left, no people, no visible brand marks.',
  },
  {
    id: 'tpl-text-in-image',
    type: 'image',
    title: 'Legible text in an image',
    summary: 'Where most image models still come apart.',
    tags: ['benchmark', 'typography'],
    prompt:
      'A clean product packaging mockup: a matte white box on a grey seamless background, with the word "MERIDIAN" printed in a precise geometric sans-serif across the front, correctly spelled and evenly spaced. Studio lighting, soft shadow.',
  },
]

export function modelById(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id)
}

export function modelsFor(type: string): Model[] {
  return MODELS.filter((x) => x.modalities.includes(type as Modality))
}

export function templatesFor(type: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((t) => t.type === type)
}
