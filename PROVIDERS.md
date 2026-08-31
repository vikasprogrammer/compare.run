# Adding a provider to compare.run

Every model call in this app goes through one interface. Nothing else — not the
UI, not the runner, not the database — knows which service answered. Adding an
integration means adding one file and one array entry.

## The interface

```ts
// src/lib/providers/types.ts
interface Provider {
  id: string
  label: string
  modalities: Modality[]        // 'code' | 'content' | 'image' | 'video'
  keyEnvVar: string             // what the user sets to switch it on
  docsUrl: string               // where they get the key
  isConfigured(): boolean
  generate(req: GenerateRequest): Promise<GenerateResult>
}
```

`generate` receives the prompt, the modality, the provider-native model id and an
`AbortSignal`. It returns an `Output` plus token counts and — if the service
reports it — the real cost of the call. Return `costUsd: null` rather than
estimating; the UI renders an honest dash.

## If the service speaks OpenAI chat-completions

Most aggregators do. Use the factory:

```ts
// src/lib/providers/index.ts
createCompatibleProvider({
  id: 'together',
  label: 'Together',
  baseUrl: 'https://api.together.xyz/v1',
  keyEnvVar: 'TOGETHER_API_KEY',
  docsUrl: 'https://api.together.ai/settings/api-keys',
  modalities: ['code', 'content'],
})
```

Two optional flags cover the common divergences: `requestUsageAccounting` (send
`usage: {include: true}` and read real spend back — OpenRouter does this) and
`supportsImageModality` (send `modalities: ['image','text']`).

The factory already handles retry-with-backoff on 429/5xx, JSON-mode code output,
and unwrapping models that ignore the response contract.

## If it does not

Implement `Provider` directly. A video house — fal.ai, Replicate — submits a job
and polls for a result, so `generate` becomes submit-then-poll against the signal.
Return a `VideoOutput` with a poster and a shot list and the existing player
renders it.

## Then

1. Add the provider to `PROVIDERS` in `src/lib/providers/index.ts`.
2. Add its models to `MODELS` in `src/lib/catalog.ts` with `providerId` set to
   your provider's `id` and `providerModel` set to the wire identifier.
3. Put the key in `.env.local` and restart.

The UI picks it up with no further changes: the header reports it as connected,
the composer offers its models for the modalities it declares, and any modality
still unserved says so in plain words rather than failing silently.

## Currently shipped

| Provider | Modalities | Key |
|---|---|---|
| OpenRouter | code, content, image | `OPENROUTER_API_KEY` |

**Video is unserved.** OpenRouter carries no video models, so Veo, Sora, Runway
and Kling are listed in the catalog but bound to a `fal` provider that does not
exist yet. That gap is deliberate and visible — it is the first integration
worth contributing.
