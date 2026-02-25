---
title: Integration Examples
weight: 20
---

Code examples for integrating ZIRI into your applications.

## Node.js Integration

### Basic Usage

```javascript {filename="index.js"}
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: process.env.ZIRI_API_KEY,
	proxyUrl: process.env.ZIRI_PROXY_URL || "http://localhost:3100",
});

async function makeRequest() {
	try {
		const response = await sdk.chatCompletions({
			provider: "openai",
			model: "gpt-4o-mini",
			messages: [{ role: "user", content: "Hello!" }],
		});

		console.log(response.choices[0].message.content);
	} catch (error) {
		console.error("Request failed:", error.message);
	}
}
```

### With Error Handling

```javascript
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: process.env.ZIRI_API_KEY,
	proxyUrl: process.env.ZIRI_PROXY_URL,
});

async function makeRequestWithRetry() {
	const maxRetries = 3;
	let retries = 0;

	while (retries < maxRetries) {
		try {
			const response = await sdk.chatCompletions({
				provider: "openai",
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: "Hello!" }],
			});

			return response;
		} catch (error) {
			if (error.message.includes("Rate limit exceeded")) {
				const retryAfter = parseInt(
					error.message.match(/retry after (\d+)/)?.[1] || "60"
				);
				await new Promise((resolve) =>
					setTimeout(resolve, retryAfter * 1000)
				);
				retries++;
				continue;
			}

			throw error;
		}
	}

	throw new Error("Max retries exceeded");
}
```

## Python Integration

### Using `requests`

```python {filename="app.py"}
import os
import requests

ZIRI_API_KEY = os.getenv('ZIRI_API_KEY')
ZIRI_PROXY_URL = os.getenv('ZIRI_PROXY_URL', 'http://localhost:3100')

def make_request():
    response = requests.post(
        f'{ZIRI_PROXY_URL}/api/chat/completions',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': ZIRI_API_KEY
        },
        json={
            'provider': 'openai',
            'model': 'gpt-4o-mini',
            'messages': [
                {'role': 'user', 'content': 'Hello!'}
            ]
        }
    )

    if response.status_code == 200:
        return response.json()
    raise Exception(f'Request failed: {response.status_code} {response.text}')
```

### With Error Handling

```python
import os
import requests
import time

ZIRI_API_KEY = os.getenv('ZIRI_API_KEY')
ZIRI_PROXY_URL = os.getenv('ZIRI_PROXY_URL', 'http://localhost:3100')

def make_request_with_retry():
    max_retries = 3
    retries = 0

    while retries < max_retries:
        response = requests.post(
            f'{ZIRI_PROXY_URL}/api/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': ZIRI_API_KEY
            },
            json={
                'provider': 'openai',
                'model': 'gpt-4o-mini',
                'messages': [
                    {'role': 'user', 'content': 'Hello!'}
                ]
            }
        )

        if response.status_code == 200:
            return response.json()
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            time.sleep(retry_after)
            retries += 1
            continue
        raise Exception(f'Request failed: {response.status_code} {response.text}')

    raise Exception('Max retries exceeded')
```

## React Integration

### Using `fetch`

```javascript {filename="ChatComponent.jsx"}
import { useState } from "react";

function ChatComponent() {
	const [message, setMessage] = useState("");
	const [response, setResponse] = useState("");
	const [loading, setLoading] = useState(false);

	const apiKey = process.env.REACT_APP_ZIRI_API_KEY;
	const proxyUrl =
		process.env.REACT_APP_ZIRI_PROXY_URL || "http://localhost:3100";

	async function sendMessage() {
		setLoading(true);
		try {
			const res = await fetch(`${proxyUrl}/api/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-API-Key": apiKey,
				},
				body: JSON.stringify({
					provider: "openai",
					model: "gpt-4o-mini",
					messages: [{ role: "user", content: message }],
				}),
			});

			if (!res.ok) {
				throw new Error(`Request failed: ${res.status}`);
			}

			const data = await res.json();
			setResponse(data.choices[0].message.content);
		} catch (error) {
			console.error("Error:", error);
			setResponse("Error: " + error.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<input
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				placeholder="Enter message"
			/>
			<button onClick={sendMessage} disabled={loading}>
				Send
			</button>
			{response && <div>{response}</div>}
		</div>
	);
}
```

### Using the SDK

```javascript {filename="ChatComponent.jsx"}
import { UserSDK } from "@ziri/sdk";
import { useState } from "react";

function ChatComponent() {
	const [message, setMessage] = useState("");
	const [response, setResponse] = useState("");
	const [loading, setLoading] = useState(false);

	const sdk = new UserSDK({
		apiKey: process.env.REACT_APP_ZIRI_API_KEY,
		proxyUrl:
			process.env.REACT_APP_ZIRI_PROXY_URL || "http://localhost:3100",
	});

	async function sendMessage() {
		setLoading(true);
		try {
			const data = await sdk.chatCompletions({
				provider: "openai",
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: message }],
			});

			setResponse(data.choices[0].message.content);
		} catch (error) {
			console.error("Error:", error);
			setResponse("Error: " + error.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<input
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				placeholder="Enter message"
			/>
			<button onClick={sendMessage} disabled={loading}>
				Send
			</button>
			{response && <div>{response}</div>}
		</div>
	);
}
```

## CLI Integration

```javascript {filename="ziri-chat.js"}
#!/usr/bin/env node

import { UserSDK } from "@ziri/sdk";

const apiKey = process.env.ZIRI_API_KEY;
const proxyUrl = process.env.ZIRI_PROXY_URL || "http://localhost:3100";

if (!apiKey) {
	console.error("ZIRI_API_KEY environment variable required");
	process.exit(1);
}

const sdk = new UserSDK({ apiKey, proxyUrl });

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
	console.error('Usage: ziri-chat "your prompt"');
	process.exit(1);
}

try {
	const response = await sdk.chatCompletions({
		provider: "openai",
		model: "gpt-4o-mini",
		messages: [{ role: "user", content: prompt }],
	});

	console.log(response.choices[0].message.content);
} catch (error) {
	console.error("Error:", error.message);
	process.exit(1);
}
```

## Batch Processing

```javascript
import { UserSDK } from "@ziri/sdk";

const sdk = new UserSDK({
	apiKey: process.env.ZIRI_API_KEY,
	proxyUrl: process.env.ZIRI_PROXY_URL,
});

async function processBatch(prompts) {
	const results = [];

	for (const prompt of prompts) {
		try {
			const response = await sdk.chatCompletions({
				provider: "openai",
				model: "gpt-4o-mini",
				messages: [{ role: "user", content: prompt }],
			});

			results.push({
				prompt,
				response: response.choices[0].message.content,
				success: true,
			});
		} catch (error) {
			results.push({
				prompt,
				error: error.message,
				success: false,
			});
		}
	}

	return results;
}
```

## Error Handling Patterns

### Handle Rate Limits

```javascript
async function makeRequestWithRateLimitHandling() {
	try {
		return await sdk.chatCompletions({
			/* ... */
		});
	} catch (error) {
		if (error.message.includes("Rate limit exceeded")) {
			const retryAfter = 60; // seconds
			await new Promise((resolve) =>
				setTimeout(resolve, retryAfter * 1000)
			);
			return makeRequestWithRateLimitHandling();
		}
		throw error;
	}
}
```

### Handle Authorization Denied

```javascript
async function makeRequestWithAuthHandling() {
	try {
		return await sdk.chatCompletions({
			/* ... */
		});
	} catch (error) {
		if (error.message.includes("Authorization denied")) {
			console.error("Request denied by policy. Check your policies.");
			return null;
		}
		throw error;
	}
}
```

## Next Steps

-   [SDK Documentation](/docs/sdk/)
-   [API Reference](/docs/api-reference/)
-   [Real-World Scenarios](/docs/examples/real-world-scenarios)
