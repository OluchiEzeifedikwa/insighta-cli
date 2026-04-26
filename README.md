# Insighta CLI

A globally installable CLI tool for interacting with the Insighta Labs platform — authenticate via GitHub, query demographic profiles, and export data from your terminal.

## System Architecture

The system is split into three separate repositories:

- **Backend** — Express.js API server with PostgreSQL via Prisma, deployed on Vercel
- **CLI** — This repo. A Node.js CLI tool that communicates with the backend API
- **Web Portal** — Browser-based interface using the same backend API

All interfaces share the same backend as a single source of truth.

## Installation

```bash
npm install -g .
```

After installation, the `insighta` command is available globally.

## Authentication Flow

The CLI uses GitHub OAuth with PKCE (Proof Key for Code Exchange):

1. Run `insighta login`
2. CLI generates a `code_verifier` and derives a `code_challenge` (SHA-256)
3. CLI starts a temporary local HTTP server on a random free port
4. CLI calls the backend `GET /auth/github` with the `code_challenge` and `redirect_uri`
5. Backend builds the GitHub OAuth URL and returns it
6. CLI opens the URL in your browser
7. You authorize the app on GitHub
8. GitHub redirects to the backend callback, which redirects to the CLI's local server
9. CLI captures the `code` and `state`, validates the state
10. CLI sends `code`, `state`, and `code_verifier` to backend `POST /auth/github/token`
11. Backend verifies PKCE, exchanges the code with GitHub, and issues tokens
12. CLI stores tokens at `~/.insighta/credentials.json`
13. Terminal confirms: `Logged in as @username`

## Token Handling

- **Access token** — expires in 3 minutes, sent as `Authorization: Bearer <token>` on every request
- **Refresh token** — expires in 5 minutes, stored locally alongside the access token
- On a `401` response, the CLI automatically attempts to refresh the access token using the stored refresh token
- If the refresh token is also expired, the CLI prompts you to run `insighta login` again
- Tokens are stored at `~/.insighta/credentials.json`

## Role Enforcement

The backend enforces two roles:

| Role | Permissions |
|---|---|
| `admin` | Create profiles, delete profiles, list, search, export |
| `analyst` | List, search, export profiles (read-only) |

The CLI does not enforce roles itself — it relies entirely on the backend returning `403 Forbidden` for unauthorized actions. Errors are displayed clearly in the terminal.

## Natural Language Parsing

The `insighta profiles search` command accepts a plain English query:

```bash
insighta profiles search "young females from nigeria"
```

The backend parses the query using keyword extraction to identify:
- **Gender** — keywords like "male", "female"
- **Age group** — keywords like "young", "adult", "senior", "child", "teenager"
- **Country** — country names or demonyms like "nigeria", "nigerian"

The parsed filters are applied to the database query to return matching profiles.

## CLI Usage

### Auth Commands

```bash
insighta login        # Login with GitHub OAuth
insighta logout       # Logout and invalidate session
insighta whoami       # Show current logged-in user
```

### Profile Commands

```bash
# List profiles
insighta profiles list
insighta profiles list --gender male
insighta profiles list --country NG
insighta profiles list --age-group adult
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc
insighta profiles list --page 2 --limit 20

# Get a single profile
insighta profiles get <id>

# Natural language search
insighta profiles search "young males from nigeria"

# Create a profile (admin only)
insighta profiles create --name "Harriet Tubman"

# Export profiles to CSV
insighta profiles export --format csv
insighta profiles export --format csv --gender male --country NG
```

## Environment Variables

| Variable | Description |
|---|---|
| `BACKEND_URL` | URL of the backend API |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID (used by backend) |
