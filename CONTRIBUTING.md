# Contributing to the Project

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
