# Cloudflare Worker Deployment Instructions

## Step 1: Create the Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Click on **Workers & Pages** in the sidebar
4. Click **Create application**
5. Click **Create Worker**
6. Give it a name (e.g., `hls-proxy`)
7. Click **Deploy**

## Step 2: Add the Code

1. In the Worker editor, delete the default code
2. Copy and paste the contents of `cloudflare-worker-hls-proxy.js`
3. Click **Save and deploy**

## Step 3: Get Your Worker URL

1. After deployment, you'll see your Worker URL
2. It will be something like: `https://hls-proxy.your-username.workers.dev`
3. Copy this URL - you'll need it for the next step

## Step 4: Update Your Code

Update `src/app/api/animepahe/episode/sources/route.ts` to use your Cloudflare Worker URL instead of the local proxy.

Replace the `buildProxyUrl` function with:

```typescript
function buildProxyUrl(url?: string | null, referer?: string | null) {
  if (!url) return null
  // Use Cloudflare Worker for vault-*.owocdn.top streams
  // The worker sets the correct kwik.cx referer
  const isVaultStream = url.includes('vault-') && url.includes('owocdn.top')
  if (isVaultStream) {
    const workerUrl = 'https://YOUR-WORKER-URL.workers.dev' // Replace with your actual worker URL
    return `${workerUrl}?url=${encodeURIComponent(url)}`
  }
  // Use local proxy for other streams
  const params = new URLSearchParams()
  params.set('url', url)
  if (referer) {
    params.set('referer', referer)
  }
  return `/api/proxy/hls?${params.toString()}`
}
```

## Optional: Custom Domain

If you want to use a custom domain:
1. Go to your Worker settings
2. Click **Triggers**
3. Add a custom domain (requires a domain in your Cloudflare account)

## Testing

After deployment, test by visiting:
`https://YOUR-WORKER-URL.workers.dev?url=https://vault-99.owocdn.top/stream/99/01/.../uwu.m3u8`

You should see the M3U8 playlist with proxied URLs.

