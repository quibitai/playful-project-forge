# AI Chat Application Template

This is a comprehensive, modular foundation for building AI-powered chat applications. It's designed to be easily adapted for various use cases and client-specific solutions.

## Core Features

- 🤖 Real-time AI chat interface
- 💾 Message history persistence
- 🔄 Support for multiple AI models (GPT-4o-mini and GPT-4o)
- ⚡ Streaming responses
- 👤 User authentication
- 🔐 Secure data handling
- 🎨 Modern, responsive UI

## Tech Stack

- **Frontend**: React + TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase
  - Authentication
  - PostgreSQL Database
  - Edge Functions
- **AI Integration**: OpenAI API

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── chat/          # Chat-specific components
│   └── ui/            # shadcn/ui components
├── contexts/          # React contexts
├── hooks/             # Custom React hooks
├── integrations/      # External service integrations
├── operations/        # Business logic operations
├── pages/            # Page components
├── reducers/         # State management
└── types/            # TypeScript type definitions

supabase/
└── functions/        # Supabase Edge Functions
```

## Database Schema

### Conversations Table
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `title`: Text (Optional)
- `model`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Messages Table
- `id`: UUID (Primary Key)
- `conversation_id`: UUID (Foreign Key to conversations)
- `user_id`: UUID (Foreign Key to auth.users)
- `role`: Text ('user' | 'assistant' | 'system')
- `content`: Text
- `created_at`: Timestamp

### Profiles Table
- `id`: UUID (Primary Key, Foreign Key to auth.users)
- `username`: Text (Optional)
- `avatar_url`: Text (Optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Key Components

### ChatContext
Manages the global chat state including:
- Conversation management
- Message handling
- Loading states
- Error handling

### Chat Components
- `ChatMessage`: Renders individual chat messages
- `ChatInput`: Handles user input and message submission
- `ModelSelector`: Allows switching between AI models

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and configure environment variables
4. Run the development server: `npm run dev`

## Extending the Template

This template can be extended in various ways:

1. **Custom AI Models**: Add support for different AI models by updating the ModelSelector
2. **Enhanced Message Types**: Extend the message schema for rich content
3. **Additional Features**: Add file uploads, code highlighting, or other features
4. **Custom UI**: Modify the existing components or add new ones
5. **Backend Integration**: Add more Supabase Edge Functions for additional functionality