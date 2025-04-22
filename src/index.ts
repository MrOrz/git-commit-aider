#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execa } from 'execa';

// Helper function to validate arguments for the commit_staged tool
const isValidCommitArgs = (
    args: any
): args is { message: string; cwd?: string } =>
    typeof args === 'object' &&
    args !== null &&
    typeof args.message === 'string' &&
    (args.cwd === undefined || typeof args.cwd === 'string');

// Create the server instance
const server = new Server(
    {
        name: 'git-commit-aider',
        version: '0.1.0',
        description: 'Make git commits on behalf of AI, so that you can track AI contribution in your codebase',
    },
    {
        capabilities: {
            tools: {}, // Tools will be registered dynamically
        },
    }
);

// --- Tool Handlers ---

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'commit_staged',
            description: 'Commit staged changes with a specific message, appending "(aider)" to the committer name.',
            inputSchema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'The commit message.',
                    },
                    cwd: {
                        type: 'string',
                        description: 'Optional: The working directory for the git command (defaults to the workspace root).',
                    }
                },
                required: ['message'],
            },
        },
    ],
}));

// Handler for executing the commit_staged tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'commit_staged') {
        throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
        );
    }

    if (!isValidCommitArgs(request.params.arguments)) {
        throw new McpError(
            ErrorCode.InvalidParams,
            'Invalid arguments for commit_staged. Requires "message" (string) and optional "cwd" (string).'
        );
    }

    const { message, cwd } = request.params.arguments;
    const executionOptions = cwd ? { cwd } : {};

    try {
        // Get original git user name and email
        const { stdout: originalName } = await execa('git', ['config', 'user.name'], executionOptions);
        const { stdout: originalEmail } = await execa('git', ['config', 'user.email'], executionOptions);

        // Construct the aider committer string
        const aiderName = `${originalName.trim()} (aider)`;
        const authorString = `${aiderName} <${originalEmail.trim()}>`;

        // Execute the git commit command
        const { stdout, stderr } = await execa(
            'git',
            ['commit', '-m', message, `--author=${authorString}`],
            executionOptions
        );

        return {
            content: [
                {
                    type: 'text',
                    text: `Commit successful:\n${stdout}\n${stderr ? `Stderr:\n${stderr}` : ''}`,
                },
            ],
        };
    } catch (error: any) {
         // Check if it's an execa error
         const errorMessage = error?.stderr || error?.stdout || error?.shortMessage || error?.message || 'Unknown error during git commit.';
         // Check for specific git errors like "nothing to commit"
         if (errorMessage.includes('nothing to commit, working tree clean') || errorMessage.includes('no changes added to commit')) {
             return {
                 content: [{ type: 'text', text: `Git commit skipped: ${errorMessage}` }],
                 isError: false, // Not technically an error in execution, just nothing happened
             };
         }
         // Return a more specific error message if possible
         return {
             content: [{ type: 'text', text: `Git commit failed: ${errorMessage}` }],
             isError: true,
         };
    }
});

// --- Server Lifecycle ---

// Basic error handling
server.onerror = (error) => console.error('[MCP Error]', error);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.error('Received SIGINT, shutting down server...');
    await server.close();
    process.exit(0);
});

// Start the server
async function run() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('Git Commit Aider MCP server running on stdio');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

run();
