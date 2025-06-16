# cadetAI prototype
Find useful & actionable insights in your customer conversations.

<img width="1207" alt="image" src="https://github.com/user-attachments/assets/64cf3df5-dc29-4976-b333-703deb989a39" />

## Architecture Overview

cadetAI is a customer conversation analytics platform built with a modern full-stack architecture:

### Frontend (Next.js 15)
- **Main App** (`/app/`): React-based dashboard with chat interface and document management
- **Marketing Site** (`/website/`): Landing page and early access signup
- **Components**: Reusable UI components using Radix UI and Tailwind CSS
- **Authentication**: Supabase Auth with protected routes

### Backend Services
- **Supabase Database**: PostgreSQL with vector embeddings for document storage
- **Edge Functions**: Deno-based serverless functions for document processing
- **AI Integration**: OpenAI API for embeddings and chat functionality

### Data Pipeline
1. **Document Ingestion**: Import conversations from Intercom API
2. **Processing**: Split documents into chunks and generate embeddings
3. **Tagging**: Automatically categorize documents with AI-generated tags
4. **Storage**: Vector embeddings stored in Supabase with full-text search

### Key Features
- **Chat Interface**: AI-powered conversation analysis with RAG
- **Document Management**: Upload, process, and search customer conversations
- **Intercom Integration**: Direct import of customer support conversations
- **Vector Search**: Semantic search across document embeddings
- **Real-time Updates**: Live document processing status


