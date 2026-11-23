# MCP server

Tama serves a [Model Context Protocol](https://modelcontextprotocol.io) server at `POST /api/mcp`, so AI clients can read and edit boards as a Tama user.

- Transport: stateless streamable HTTP with JSON responses. `GET` and `DELETE` answer `405`.
- Auth: an API key in the `X-Api-Key` header, or an OAuth 2.1 access token (`Authorization: Bearer …`). Session access tokens and the internal access token are rejected.
- Permissions: every tool runs the matching REST action as the connected user, so it sees and changes only what that user can in the web app.

## Connect from the web app

Every user can connect assistants themselves in **Settings → AI Assistants**. The tab shows the server URL, step-by-step setup for Claude, ChatGPT, Claude Code, Gemini CLI, Codex, Cursor, VS Code and Windsurf, the user's own API key, and the apps connected through OAuth (with a Disconnect button).

- **Claude (claude.ai, Desktop, mobile) and ChatGPT** connect through OAuth: add Tama as a custom connector with the server URL, and approve the request on Tama's consent screen. These assistants reach Tama from the internet, so Tama must be served from a public HTTPS address.
- **Claude Code, Gemini CLI, Codex, Cursor, VS Code, Windsurf and other clients** use an API key from a command or config file. The tab fills the key into the snippet right after it is created.

## OAuth

Tama is its own OAuth 2.1 authorization server for the MCP endpoint:

| Endpoint | Purpose |
| --- | --- |
| `GET /.well-known/oauth-protected-resource/api/mcp` | Protected resource metadata (RFC 9728); `401` answers from `/api/mcp` point here in `WWW-Authenticate` |
| `GET /.well-known/oauth-authorization-server` | Authorization server metadata (RFC 8414) |
| `POST /oauth/register` | Dynamic client registration (RFC 7591) |
| `GET /oauth/authorize` | Authorization request; sends the browser to the consent screen at `/oauth/consent` |
| `POST /oauth/token` | Authorization code (PKCE `S256` required) and refresh token grants |
| `POST /oauth/revoke` | Token revocation |

- Access tokens last 1 hour and only work on `/api/mcp`. Refresh tokens last 30 days and rotate on every use.
- Only hashes of client secrets, codes and tokens are stored.
- Users see and disconnect their connected apps in Settings → AI Assistants (`GET` and `DELETE /api/oauth/connections`).
- The issuer is `BASE_URL`. When Tama runs under a sub-path, the reverse proxy must also forward the `/.well-known/oauth-*` paths at the host root.

## Get an API key

Users create, regenerate and delete their own key in Settings → AI Assistants (`POST /api/users/{id}/api-key`, `PATCH /api/users/{id}` with `apiKey: null`). Admins can still manage any user's key. The key is shown once; store it somewhere safe.

## Connect a client by hand

Claude Code:

```sh
claude mcp add --transport http tama https://tama.example.com/api/mcp \
  --header "X-Api-Key: <api key>"
```

Any client that reads an `.mcp.json`-style config:

```json
{
  "mcpServers": {
    "tama": {
      "type": "http",
      "url": "https://tama.example.com/api/mcp",
      "headers": {
        "X-Api-Key": "<api key>"
      }
    }
  }
}
```

## Tools

| Tool | What it does |
| --- | --- |
| `list_projects` | Projects the user can access, with their boards |
| `get_project` | One project with boards, managers and board memberships |
| `list_boards` | Accessible boards, optionally of one project |
| `get_board` | One board with lists, labels and members |
| `list_cards` | Cards of a board or one list (archive and trash lists return their latest cards); card templates only with `includeTemplates` |
| `get_card` | One card with labels, members, tasks, attachments and custom fields |
| `search_cards` | Cards of a board whose name or description contains every word of the query; card templates only with `includeTemplates` |
| `list_card_templates` | Card templates of a board, with the schedules of recurring ones |
| `create_card_from_template` | New card from a template, with its description, labels, members, tasks, attachments and custom fields, at the end of the list unless a position is given |
| `save_card_as_template` | Save a copy of a card as a template on its board; the card stays as it is |
| `set_card_recurrence` | Make a template recurring, or change its schedule: an RFC 5545 RRULE (daily to yearly, at most one card a day) read in an IANA time zone, and the list to make cards in |
| `delete_card_recurrence` | Stop a template from recurring; the template and the cards already made stay |
| `create_card` | New card, at the end of the list unless a position is given |
| `update_card` | Name, description, type, due date |
| `move_card` | Move to another list or board, at the end unless a position is given |
| `delete_card` | Delete a card |
| `create_task` | New task on a card; uses the first task list, creating one when the card has none |
| `update_task` | Rename, complete or reopen, assign |
| `delete_task` | Delete a task |
| `add_label_to_card`, `remove_label_from_card` | Card labels |
| `add_member_to_card`, `remove_member_from_card` | Card members |
| `create_comment`, `list_comments` | Card comments |

Results come back as JSON text holding the same records as the REST API. A refused action, such as a viewer trying to edit, comes back as a tool error with the REST error message (`Not enough rights`, `Card not found`).
