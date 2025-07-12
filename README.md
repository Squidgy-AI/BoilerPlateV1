# Squidgy Frontend

This is the frontend for the Squidgy application, a collaborative agent platform for business teams.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- HeyGen API key (for avatar streaming)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/squidgy-frontend.git
cd squidgy-frontend
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
```
Then edit `.env.local` to add your actual API keys and endpoints.

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── public/                  # Static files
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── Agents/          # Agent-related components
│   │   ├── Auth/            # Authentication components
│   │   ├── Groups/          # Group management components
│   │   ├── Header/          # Header components
│   │   ├── Invitations/     # Invitation components
│   │   └── Sidebar/         # Sidebar components
│   ├── context/             # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   └── services/            # API services
├── database/                # Database scripts
│   ├── create_queries.sql   # Table creation queries
│   ├── policies.sql         # Security policies
│   └── trigger.sql          # Database triggers
├── scripts/                 # Utility scripts
└── types/                   # TypeScript type definitions
```

## Features

- Real-time communication via WebSockets
- Interactive AI agents with different personas
- Group chat functionality
- User authentication and profile management
- Interactive avatars with speech synthesis
- Tool execution visualization
- Solar analysis tools integration
- Dashboard with session management

## Environment Variables

- `NEXT_PUBLIC_API_BASE`: Base URL for the API server
- `NEXT_PUBLIC_N8N_WEBHOOK_URL`: URL for n8n webhook integration
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin functions)
- `HEYGEN_API_KEY`: API key for HeyGen avatar streaming service

## Database Setup

The database scripts in the `database` directory can be used to set up the Supabase database:

1. Run `create_queries.sql` to create the tables
2. Run `policies.sql` to set up Row Level Security policies
3. Run `trigger.sql` to create database triggers

Alternatively, you can run the seed script:

```bash
npm run seed
# or
yarn seed
```

## Styling

The project uses Tailwind CSS for styling. The main configuration is in `tailwind.config.ts`.

## License

[MIT](https://choosealicense.com/licenses/mit/)