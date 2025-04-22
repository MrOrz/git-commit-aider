# git-commit-aider MCP Server

Make git commits on behalf of AI, so that you can track AI contribution in your codebase.

This is a TypeScript-based MCP server that provides a tool to commit staged changes in a Git repository while appending "(aider)" to the committer's name.

## Features

This MCP server provides only one tool:

`commit_staged` - Commit staged changes with a specific message.
- Takes `message` (string, required) as the commit message.
- Takes `cwd` (string, optional) to specify the working directory for the git command.
- Appends "(aider)" to the committer name automatically.
- Reads committer name and email from environment variables (`GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`) if set, otherwise falls back to `git config user.name` and `git config user.email`.

With this tool installed in your code editor, you can prompt the AI by something like:

> Commit the changes for me

This usually happens after the AI has made some changes to your codebase, so often times AI is able to provide a good commit message from the context.

Commits with "(aider)" can be picked up by [`aider --stats`](https://github.com/Aider-AI/aider/pull/2883) command, which will show you the contribution of AI in your codebase.

## Installation

To use this server, add its configuration to your MCP settings file.

```json
{
  "mcpServers": {
    "git-commit-aider": {
      "command": "npx",
      "args": ["mcp-git-commit-aider"]
    }
  }
}
```

The committer information is retrieved from:
1. Environment variables `GIT_COMMITTER_NAME` and `GIT_COMMITTER_EMAIL`, which follows [git's convention](https://git-scm.com/book/en/v2/Git-Internals-Environment-Variables).
2. Output of `git config user.name` and `git config user.email` commands.

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

Sample MCP config:
```json
{
  "mcpServers": {
    "git-commit-aider": {
      "command": "node",
      "args": [
        "/path/to/git-commit-aider/build/index.js"
      ]
    }
  }
}
```
*(Replace `/path/to/git-commit-aider` with the actual path to this server directory.)*

## Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
