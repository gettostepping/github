# API Endpoint Testing Script

This script comprehensively tests all API endpoints that support API key authentication.

## Prerequisites

- Node.js 18+ (for built-in `fetch` support)
- Your API key from the control panel
- Development server running (default: `http://localhost:3000`)

## Usage

### Basic Usage

```bash
npx ts-node scripts/test-all-api-endpoints.ts YOUR_API_KEY
```

### With Environment Variable

```bash
API_KEY=your_api_key npx ts-node scripts/test-all-api-endpoints.ts
```

### Custom Base URL

```bash
npx ts-node scripts/test-all-api-endpoints.ts YOUR_API_KEY --base-url https://your-domain.com
```

### Options

- `--verbose` - Show detailed request/response information
- `--skip-public` - Skip public API endpoint tests
- `--skip-admin` - Skip admin/private API endpoint tests
- `--base-url <url>` - Set custom base URL (default: http://localhost:3000)

### Examples

```bash
# Test all endpoints with verbose output
npx ts-node scripts/test-all-api-endpoints.ts YOUR_API_KEY --verbose

# Test only public endpoints
npx ts-node scripts/test-all-api-endpoints.ts YOUR_API_KEY --skip-admin

# Test only admin endpoints
npx ts-node scripts/test-all-api-endpoints.ts YOUR_API_KEY --skip-public

# Test against production
npx ts-node scripts/test-all-api-endpoints.ts YOUR_API_KEY --base-url https://yourdomain.com
```

## What It Tests

### Public API Endpoints
- Search Movies & TV Shows
- Get Movie/TV Details
- Get Trending Content
- Get Popular Content
- Get Related Content
- Get Recommendations
- Get TV Seasons & Episodes
- Get User Profiles
- Get Ratings
- Get Comments

### Admin/Private API Endpoints
- List Users
- User Lookup
- System Statistics
- API Status Dashboard
- Reports Management
- Pending Registrations
- Invites Management

## Output

The script provides:
- ✅/❌ Status indicators for each test
- HTTP status codes
- Response times
- Detailed error messages for failures
- Summary statistics
- Performance metrics

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║     API Endpoint Test Suite - Comprehensive Testing     ║
╚════════════════════════════════════════════════════════════╝

✓ API Key provided
  Key: ct_1234567890abcdef...

Base URL: http://localhost:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing Public API Endpoints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ [200] GET Search Movies & TV Shows (145ms)
✓ [200] GET Get Movie Details (89ms)
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 20
Passed: 18
Failed: 2
Success Rate: 90.0%

Performance Statistics:
  Average: 120ms
  Min: 45ms
  Max: 350ms
```

## Troubleshooting

### "No API key provided" Warning
- Make sure you're passing your API key as the first argument
- Or set the `API_KEY` environment variable

### Connection Errors
- Ensure your development server is running
- Check that the base URL is correct
- Verify network connectivity

### Permission Errors (403)
- Ensure your API key has the required permissions
- For admin endpoints, you need a private API key with admin permissions
- Check the API key management panel to verify permissions

### Rate Limiting (429)
- The script includes small delays between requests
- If you still hit rate limits, increase the delay in the script
- Or run tests in smaller batches using `--skip-public` or `--skip-admin`

## Customization

You can modify the test script to:
- Add more test cases
- Change test data (movie IDs, user IDs, etc.)
- Adjust rate limiting delays
- Add custom validation logic

## Notes

- The script tests endpoints with realistic but minimal data
- Some tests may require specific data to exist (e.g., user IDs)
- Failed tests don't stop the script - it continues to test all endpoints
- The script respects rate limits with small delays between requests

