# Real AI Integration Setup

## 🚀 Replace Mock AI with Real OpenAI

Your AI Mapping Assistant now supports real AI responses using OpenAI GPT-3.5-turbo!

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (it starts with `sk-`)

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-your_actual_api_key_here

# Netlify Functions Configuration
NETLIFY_DEV=true
```

### 3. Install Netlify CLI (for local development)

```bash
npm install -g netlify-cli
```

### 4. Run with Real AI

```bash
# Start the development server with Netlify functions
netlify dev
```

## Features

✅ **Real AI Responses**: Uses OpenAI GPT-3.5-turbo for intelligent mapping suggestions
✅ **Context Awareness**: AI understands your CSV columns, captions, and current mappings
✅ **Smart Suggestions**: Provides mapping suggestions with confidence levels
✅ **Error Handling**: Graceful fallback if API is unavailable
✅ **Security**: API key is kept secure in environment variables

## How It Works

1. **User Input**: You type a message in the AI chat
2. **Context Sent**: Your CSV columns, captions, and current mappings are sent to the AI
3. **AI Processing**: OpenAI analyzes your request and provides intelligent responses
4. **Mapping Suggestions**: AI can suggest specific column-to-caption mappings
5. **One-Click Apply**: Click "Apply Mapping" to instantly apply AI suggestions

## Example AI Interactions

- "Help me map these columns"
- "Suggest mappings for the remaining columns"
- "What should I map 'customer_name' to?"
- "Show me the current progress"
- "Remove the mapping for 'email'"

## Cost Considerations

- OpenAI GPT-3.5-turbo costs ~$0.002 per 1K tokens
- Typical mapping session: ~$0.01-0.05
- You can set usage limits in your OpenAI account

## Troubleshooting

### "OpenAI API key not configured"
- Make sure your `.env` file exists with the correct API key
- Restart the development server after adding the key

### "API error: 401"
- Check that your OpenAI API key is correct
- Ensure you have credits in your OpenAI account

### "API error: 429"
- You've hit the rate limit, wait a moment and try again

## Alternative AI Providers

You can easily switch to other AI providers by modifying `netlify/functions/ai-chat.ts`:

- **Anthropic Claude**: Replace OpenAI with Claude API
- **Google Gemini**: Use Google's AI model
- **Azure OpenAI**: Use Microsoft's OpenAI service
- **Local AI**: Use Ollama for local processing

## Security Notes

- Never commit your `.env` file to version control
- The API key is only used server-side in Netlify functions
- All communication is encrypted via HTTPS
