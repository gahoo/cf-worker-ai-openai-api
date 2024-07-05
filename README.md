Access cloudflare worker ai in openai compatible way. Most code are written by Claude 3.5 Sonnet.

## How to use

1. copy content of `worker.js`
2. create and paste in cloudflare worker
3. set enviroment variable `API_KEY`

```bash
curl https://YOUR_DOMAIN/ \
    -X POST \
    -H 'content-type: application/json' \
    -H 'api-key: ${YOUR_API_KEY}' \ # or 'authorization: Bearer ${YOUR_API_KEY}'
    -d '{"stream":true, "model": "@hf/thebloke/deepseek-coder-6.7b-instruct-awq", "messages": [{ "role": "system", "content": "You are a friendly assistant" }, { "role": "user", "content": "what is WASM?" }]}'
```
