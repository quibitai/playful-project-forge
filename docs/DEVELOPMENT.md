# Development Guide

## Architecture Overview

This application follows a modular architecture with clear separation of concerns:

### Frontend Architecture

1. **Components Layer**
   - Presentational components in `components/`
   - Page components in `pages/`
   - UI components from shadcn/ui

2. **State Management**
   - React Context for global state
   - Local state for component-specific data
   - Reducers for complex state logic

3. **Data Layer**
   - Supabase client for database operations
   - Edge Functions for AI integration
   - Type-safe database operations

### Backend Architecture (Supabase)

1. **Database**
   - PostgreSQL with RLS policies
   - Structured schema for conversations and messages
   - User profiles management

2. **Edge Functions**
   - OpenAI API integration
   - Streaming response handling
   - Error management

## Development Workflow

1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Code Organization**
   - Keep components small and focused
   - Use TypeScript for type safety
   - Follow the existing pattern for new features

3. **State Management**
   - Use ChatContext for global chat state
   - Implement reducers for complex state changes
   - Keep component state local when possible

4. **Adding New Features**
   - Create new components in appropriate directories
   - Update types in `types/` directory
   - Add necessary database migrations
   - Implement Edge Functions if needed

5. **Testing**
   - Test components in isolation
   - Verify database operations
   - Test Edge Functions locally

## Best Practices

1. **Code Style**
   - Use TypeScript strictly
   - Follow existing naming conventions
   - Keep components modular

2. **State Management**
   - Use contexts for shared state
   - Keep state updates atomic
   - Handle loading and error states

3. **Database Operations**
   - Use RLS policies for security
   - Keep queries efficient
   - Handle errors appropriately

4. **UI Development**
   - Use Tailwind CSS for styling
   - Follow shadcn/ui patterns
   - Ensure responsive design