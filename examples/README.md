# Examples

These examples demonstrate how to use the `@inferencesh/sdk` package.

## Setup

1. Build and link the SDK for local testing:
   ```bash
   npm run build
   npm link
   ```

2. Set your API key:
   ```bash
   export INFERENCE_API_KEY="your-api-key"
   ```

## Running Examples

```bash
# Basic usage
node examples/basic.cjs

# With real-time status updates
node examples/with-updates.cjs

# Fire and forget (don't wait for completion)
node examples/fire-and-forget.cjs

# Batch processing multiple items
node examples/batch-processing.cjs
```

## Examples Overview

| Example | Description |
|---------|-------------|
| `basic.cjs` | Simple task execution with result |
| `with-updates.cjs` | Real-time status updates via callback |
| `fire-and-forget.cjs` | Start task without waiting |
| `batch-processing.cjs` | Process multiple items sequentially |

