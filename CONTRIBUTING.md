## Contributing to ZIRI

Thanks for your interest in contributing. This project is under active development; the guidelines below focus on the new modular email provider system so external contributors can extend integrations easily.

More general contribution guidelines (issue labels, branching, testing, release process) will be added over time.

---

## Adding an email provider

Email sending is handled by a small plugin system in the proxy package. Each provider is a module that implements a common contract and is registered in a central registry. The UI builds its email configuration form from provider metadata exposed by the proxy.

You **do not** need to touch the UI or core email service to add a provider.

### 1. Provider contract (backend)

Providers live under:

- `packages/proxy/src/email-providers/`

Each provider module should export an object that matches the `EmailProvider` interface defined in:

- `packages/proxy/src/email-providers/types.ts`

Shape (simplified):

```ts
export interface EmailProvider {
  id: string               // e.g. 'smtp', 'sendgrid', 'resend'
  label: string            // human‑readable name for the config UI
  fields: ProviderField[]  // config fields shown in the UI
  fromRequired?: boolean   // whether a From address is required
  send(
    options: EmailOptions,             // { to, subject, html, text? }
    cfg: Record<string, unknown>,      // provider-specific options
    from?: string                      // configured From address
  ): Promise<boolean>
}
```

`fields` controls what the UI renders for this provider:

```ts
export interface ProviderField {
  key: string                          // key inside email.options[ key ]
  label: string                        // label shown in the UI
  type: 'text' | 'password' | 'number' | 'checkbox' | 'url'
  required?: boolean                   // if true, validated before save
  placeholder?: string
  help?: string                        // short optional help text
}
```

### 2. Create the provider module

1. Add a new file, for example:
   - `packages/proxy/src/email-providers/resend.ts`
2. Export an `EmailProvider` object, e.g.:

```ts
import type { EmailProvider, EmailOptions } from './types.js'

export const resendProvider: EmailProvider = {
  id: 'resend',
  label: 'Resend',
  fields: [
    { key: 'apiKey', label: 'Resend API Key', type: 'password', required: true },
    { key: 'region', label: 'Region', type: 'text' }
  ],
  fromRequired: true,
  async send(options: EmailOptions, cfg: Record<string, unknown>, from?: string): Promise<boolean> {
    const apiKey = String(cfg.apiKey || '')
    if (!apiKey) throw new Error('Resend API key not provided')
    if (!from) throw new Error('From address required for Resend')




    return true
  }
}
```

3. Add any required dependency (for example, the provider’s SDK) to:
   - `packages/proxy/package.json`

### 3. Register the provider

The registry is wired in:

- `packages/proxy/src/email-providers/index.ts`

Add an import and register your provider:

```ts
import { registerEmailProvider } from './registry.js'
import { resendProvider } from './resend.js'

registerEmailProvider(resendProvider)
```

That’s it for the backend. The core `sendEmail` function looks up the provider by `config.email.provider` and calls `provider.send(...)`.

### 4. Configuration shape

The proxy config expects email configuration in this generic form:

```jsonc
{
  "email": {
    "enabled": true,
    "provider": "resend",
    "from": "noreply@example.com",
    "options": {
      "apiKey": "your-api-key",
      "region": "us-east-1"
    }
  }
}
```

Notes:

- `provider` must match your provider’s `id`.
- All provider‑specific values live under the `options` object and are passed as `cfg` into `send(...)`.
- Existing providers (SMTP, SendGrid, Mailgun, SES, Manual) follow the same pattern; see their modules for reference.

The loader still understands the older nested shape (`smtp`, `sendgrid`, `mailgun`, `ses`) and migrates it into `options` internally, so existing configs keep working.

### 5. UI behavior (for context)

The UI:

- Calls `GET /api/config/email-providers` to fetch the list of providers and their `fields` / `fromRequired`.
- Renders the email provider select and fields **entirely from this metadata**.
- Sends back `email: { enabled, provider, from, options }` when saving.

Because of this:

- You **do not** need to touch any UI code to add a new provider.
- As long as your backend module exports the right `fields` and `send` implementation, the provider will appear automatically in the config screen.