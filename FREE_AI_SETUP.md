# 🆓 Free AI Integration Options

## Choose Your Free AI Solution

### 🥇 **Option 1: OpenAI Free Tier** (Recommended)
**Best for**: Ease of use, high quality responses
- **Cost**: $5 free credits when you sign up
- **Usage**: ~2,500 typical mapping conversations
- **Setup**: 2 minutes
- **Quality**: Excellent

**Setup**:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up (free)
3. Get your API key
4. Add to `.env`: `OPENAI_API_KEY=sk-your_key_here`

### 🥈 **Option 2: Google Gemini** (Completely Free)
**Best for**: No cost, generous limits
- **Cost**: Completely free
- **Limits**: 15 requests/minute, 1,500/day
- **Setup**: 3 minutes
- **Quality**: Very good

**Setup**:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `.env`: `GOOGLE_API_KEY=your_key_here`
4. Use function: `ai-chat-gemini.ts`

### 🥉 **Option 3: Local AI with Ollama** (100% Free)
**Best for**: Privacy, no internet required
- **Cost**: Completely free
- **Limits**: None (runs on your computer)
- **Setup**: 10 minutes
- **Quality**: Good

**Setup**:
1. Install [Ollama](https://ollama.ai/)
2. Run: `ollama pull llama2`
3. Add to `.env`: `OLLAMA_URL=http://localhost:11434`
4. Use function: `ai-chat-local.ts`

## Quick Start Guide

### For OpenAI (Recommended):
```bash
# 1. Create .env file
echo "OPENAI_API_KEY=sk-your_key_here" > .env

# 2. Start server
netlify dev

# 3. Test it!
```

### For Google Gemini:
```bash
# 1. Create .env file
echo "GOOGLE_API_KEY=your_key_here" > .env

# 2. Update frontend to use Gemini
# Change the fetch URL in ai-chat.tsx to:
# fetch('/.netlify/functions/ai-chat-gemini', {

# 3. Start server
netlify dev
```

### For Local AI:
```bash
# 1. Install Ollama
# Download from: https://ollama.ai/

# 2. Pull a model
ollama pull llama2

# 3. Start Ollama
ollama serve

# 4. Update frontend to use local AI
# Change the fetch URL in ai-chat.tsx to:
# fetch('/.netlify/functions/ai-chat-local', {

# 5. Start server
netlify dev
```

## Cost Comparison

| Option | Cost | Messages | Setup Time | Quality |
|--------|------|----------|------------|---------|
| OpenAI Free | $5 credits | ~2,500 | 2 min | ⭐⭐⭐⭐⭐ |
| Google Gemini | Free | 1,500/day | 3 min | ⭐⭐⭐⭐ |
| Local Ollama | Free | Unlimited | 10 min | ⭐⭐⭐ |

## Which Should You Choose?

### Choose **OpenAI** if:
- You want the best quality responses
- You're okay with eventually paying (after free credits)
- You want the easiest setup

### Choose **Google Gemini** if:
- You want completely free AI
- You don't need more than 1,500 requests per day
- You want good quality without cost

### Choose **Local Ollama** if:
- You want complete privacy
- You have a decent computer (8GB+ RAM)
- You want unlimited free usage
- You're comfortable with technical setup

## Testing Your Setup

Run this test script to verify your AI integration:

```bash
node test-ai.js
```

## Troubleshooting

### OpenAI Issues:
- **401 Error**: Check your API key
- **429 Error**: Rate limit hit, wait a moment
- **No credits**: Add payment method to OpenAI account

### Google Gemini Issues:
- **403 Error**: Check your API key
- **429 Error**: Hit rate limit, wait 1 minute
- **Quota exceeded**: Wait until tomorrow or upgrade

### Local Ollama Issues:
- **Connection refused**: Make sure Ollama is running
- **Model not found**: Run `ollama pull llama2`
- **Slow responses**: Try a smaller model like `mistral`

## Switching Between Options

To switch between AI providers, just change the fetch URL in `client/components/ai-chat.tsx`:

```typescript
// For OpenAI
fetch('/.netlify/functions/ai-chat', {

// For Google Gemini  
fetch('/.netlify/functions/ai-chat-gemini', {

// For Local Ollama
fetch('/.netlify/functions/ai-chat-local', {
```

## Security Notes

- **OpenAI/Google**: API keys are secure server-side
- **Local AI**: No data leaves your computer
- **All options**: Use HTTPS in production
