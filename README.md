# compare.run

Run one prompt across many models and compare what each produced — side by side,
with the real cost and the real time it took.

The thesis: a screenshot of two chat windows is not a comparison. Holding the
prompt fixed, running it against several models at once, and keeping the history
is.

![compare.run comparing three models on one landing-page brief](docs/screenshot.png)

*One brief, three models, live output. Claude Haiku 4.5 finished in 19s for
$0.02; DeepSeek V3.2 took 2m 42s for $0.0019; Gemini 3.7 Flash took 1m 23s for
$0.03. An 18x cost spread and an 8x time spread on the same prompt — and three
pages that look nothing like each other. Those previews are the pages the models
actually wrote, rendered in sandboxed iframes.*

## Running it

```bash
npm install
cp .env.local.example .env.local   # add an OPENROUTER_API_KEY
npm run dev
```

Then open **http://localhost:4320** — use `localhost`, not `127.0.0.1`, or Next
blocks its own dev chunks and the page silently fails to hydrate.

## What it does

- **Experiments → runs → results.** One experiment holds many runs; each run
  holds one result per model, with its own output, cost, tokens and timing.
- **Runs snapshot what they were given.** The prompt and the model line-up live
  on the run, not the experiment, so editing the brief for a new run can never
  rewrite what an earlier run claims it ran.
- **Re-running is editing.** "Run again" opens the composer pre-filled; change
  the prompt or the line-up and the difference is recorded on the new run and
  shown as a word-level diff.
- **Four modalities.** Code (with the generated page rendered live), content,
  image, and video — video pending a provider that serves it.

## Providers

Bring your own key. One integration ships — OpenRouter, which covers text, code
and image with a single key. It carries no video models, so that modality is
visible but unserved until someone adds fal.ai or Replicate.

Adding an integration is one file and one array entry: see
[PROVIDERS.md](./PROVIDERS.md).

| Provider | Modalities | Key |
|---|---|---|
| OpenRouter | code, content, image | `OPENROUTER_API_KEY` |

## Status

Early. The runner works and the comparisons are real; there is no way to record
a judgement on a result yet, and video has no provider behind it.

## Stack

Next.js App Router, Tailwind, shadcn/ui, and SQLite via `node:sqlite` — no
database server and no native module. Requires Node 24.

## Licence

MIT — see [LICENSE](./LICENSE).
