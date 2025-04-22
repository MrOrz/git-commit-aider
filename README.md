# git-commit-aider MCP Server

Make git commits on behalf of AI, so that you can track AI contribution in your codebase.

This is a TypeScript-based MCP server that provides a tool to commit staged changes in a Git repository while appending "(aider)" to the committer's name.

## Features

### Tools
- `commit_staged` - Commit staged changes with a specific message.
  - Takes `message` (string, required) as the commit message.
  - Takes `cwd` (string, optional) to specify the working directory for the git command.
  - Appends "(aider)" to the committer name automatically.
  - Reads committer name and email from environment variables (`GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`) if set, otherwise falls back to `git config user.name` and `git config user.email`.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Installation

To use this server, add its configuration to your MCP settings file.

```json
{
  "mcpServers": {
    "git-commit-aider": {
      "command": "node",
      "args": [
        "/path/to/git-commit-aider/build/index.js"
      ],
      "env": {
        "GIT_COMMITTER_NAME": "Your Name",
        "GIT_COMMITTER_EMAIL": "your.email@example.com"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```
*(Replace `/path/to/git-commit-aider` with the actual path to this server directory. Set `GIT_COMMITTER_NAME` and `GIT_COMMITTER_EMAIL` if you want to override the Git config.)*

## Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
