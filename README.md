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

### Alternative: amend author after commit

If you don't want to use this MCP server, you can also use the `git` command directly in your terminal.

You can proceed with normal commit first, and then use the following git command to change the author of the last commit:

```sh
git commit --amend --author="$(git config user.name) (aider) <$(git config user.email)>"
```

This will change the author of the last commit to your name with "(aider)" appended.

To simplify the process of amending the last commit's author, you can set up a Git alias called `git-aimend`. Run the following command in your terminal:

```sh
git config --global alias.aimend 'commit --amend --author="$(git config user.name) (aider) <$(git config user.email)>"'
```

Once set up, you can use the alias by running:

```sh
git aimend
```

## Calculating AI contribution

Commits with "(aider)" can be picked up by [`aider --stats`](https://github.com/Aider-AI/aider/pull/2883) command, which will show you the contribution of AI in your codebase.

Alternatively, you can use the following script to calculate the contribution of AI in your codebase, measured in lines of code (added, deleted, and total changes).

```sh
#!/bin/bash

# Script to calculate line changes (added, deleted, total) by AI and human authors
# between two commits.
# Output is in JSON format.
#
# This logic is extracted and altered from git-quick-stats.sh, MIT license.

# --- Configuration ---
# You may change the config to match your repository's convention.

# String to identify AI-generated commits in author names
AI_MATCHER="(aider)"

# Define patterns for lock files to be excluded
# These will be converted to git pathspecs like ":(exclude)*package-lock.json"
LOCKFILE_PATTERNS=(
  "*package-lock.json"
  "*.lock"
)

# --- Helper Functions ---
function print_usage() {
  echo "Usage: $0 <REVISION_RANGE>"
  echo "  <REVISION_RANGE>: The revision range to analyze (e.g., HEAD~5..HEAD, my-branch, commit_sha)."
  echo "  Refer to 'git help log' or 'git help revisions' for more range options."
  echo "Example: $0 HEAD~5..HEAD"
  echo "Example: $0 origin..HEAD"
  echo "Example: $0 my-feature-branch"
  echo "Example: $0 abcdef1..fedcba2"
}

# --- Argument Parsing ---
if [ "$#" -ne 1 ]; then
  echo "Error: Incorrect number of arguments. Please provide a single revision range."
  print_usage
  exit 1
fi

REVISION_RANGE="$1"

# --- Main Logic ---

# Construct pathspec arguments for git log
pathspec_args=()
for pattern in "${LOCKFILE_PATTERNS[@]}"; do
  pathspec_args+=(":(exclude)$pattern")
done

git_log_output=$(git log "$REVISION_RANGE" --numstat --pretty="format:AuthorName:%an" -- "${pathspec_args[@]}")

# DEBUG: Uncomment to check the calculation for each commit.
# echo "$git_log_output"

# Process the log output with awk
result_json=$(echo "$git_log_output" | awk -v ai_matcher="$AI_MATCHER" '
BEGIN {
  ai_added = 0
  ai_deleted = 0
  human_added = 0
  human_deleted = 0
  current_author = ""
  is_ai_author = 0
}

/^AuthorName:/ {
  # Extract author name
  current_author = substr($0, length("AuthorName:") + 1)
  if (index(current_author, ai_matcher) > 0) {
    is_ai_author = 1
  } else {
    is_ai_author = 0
  }
  next
}

# Skip empty lines between commit blocks or lines that are not numstat
NF == 0 || !($1 ~ /^[0-9]+$/ && $2 ~ /^[0-9]+$/) {
  next
}

# Process numstat line: <added> <deleted> <file>
{
  added_lines = $1
  deleted_lines = $2

  # Skip binary files where numstat shows "-" for lines
  if (added_lines == "-" || deleted_lines == "-") {
    next
  }

  # Aggregate stats per author and file for details array
  file_name = $3
  # Robust key using File Separator character \034
  key = current_author "\034" file_name

  file_author_added[key] += added_lines
  file_author_deleted[key] += deleted_lines

  if (is_ai_author) {
    ai_added += added_lines
    ai_deleted += deleted_lines
  } else {
    human_added += added_lines
    human_deleted += deleted_lines
  }
}

END {
  ai_total_changed = ai_added + ai_deleted
  human_total_changed = human_added + human_deleted
  overall_total_changed = ai_total_changed + human_total_changed
  ai_percentage = 0.00

  if (overall_total_changed > 0) {
    ai_percentage = (ai_total_changed / overall_total_changed) * 100
  }

  printf "{\n"
  printf "  \"ai_percentage\": %.2f,\n", ai_percentage
  printf "  \"ai_changes\": {\"added\": %d, \"deleted\": %d, \"total\": %d},\n", ai_added, ai_deleted, ai_total_changed
  printf "  \"human_changes\": {\"added\": %d, \"deleted\": %d, \"total\": %d},\n", human_added, human_deleted, human_total_changed

  # Details array
  printf "  \"details\": [\n"
  first_detail = 1
  # Iterate over one of the arrays, keys should be consistent
  for (key in file_author_added) {
    if (!first_detail) {
      printf ",\n"
    }
    first_detail = 0

    # Split key "author\034fileName" into key_parts array
    # key_parts[1] will be author, key_parts[2] will be fileName
    split(key, key_parts, "\034")
    author = key_parts[1]
    fileName = key_parts[2]

    # Escape double quotes for JSON compatibility
    gsub(/"/, "\\\"", author)
    gsub(/"/, "\\\"", fileName)

    detail_added = file_author_added[key] + 0 # Ensure numeric
    detail_deleted = file_author_deleted[key] + 0 # Ensure numeric
    detail_total = detail_added + detail_deleted

    printf "    {\n"
    printf "      \"fileName\": \"%s\",\n", fileName
    printf "      \"author\": \"%s\", \"isAI\": %s,\n", author, (index(author, ai_matcher) > 0 ? "true" : "false")
    printf "      \"added\": %d, \"deleted\": %d, \"total\": %d\n", detail_added, detail_deleted, detail_total
    printf "    }"
  }
  printf "\n  ]\n"
  printf "}\n"
}
')

# --- Output ---
echo "$result_json"
```

Usage example:

```sh
# Assume the script is saved as `calculate_ai_contribution.sh` and is executable (chmod +x calculate_ai_contribution.sh)

# Example 1: Analyze the last 5 commits
./calculate_ai_contribution.sh HEAD~5..HEAD

# Example 2: Analyze commits between a specific commit and HEAD
./calculate_ai_contribution.sh 90a5fcd4..HEAD

# Example 3: Analyze all commits on a feature branch not yet in main
./calculate_ai_contribution.sh main..my-feature-branch

# Example 4: Analyze commits between two tags
./calculate_ai_contribution.sh v1.0..v1.1

# Example output (will vary based on your repository and range):
# {
#   "ai_percentage": 48.53,
#   "ai_changes": { "added": 100, "deleted": 32, "total": 132 },
#   "human_changes": { "added": 103, "deleted": 37, "total": 140 },
#   "details": [
#     {
#       "fileName": "src/featureA.js",
#       "author": "Developer One (aider)",
#       "added": 60, "deleted": 10, "total": 70
#     },
#     {
#       "fileName": "src/featureB.js",
#       "author": "Developer One (aider)",
#       "added": 40, "deleted": 22, "total": 62
#     },
#     {
#       "fileName": "src/utils.js",
#       "author": "Developer Two",
#       "added": 80, "deleted": 15, "total": 95
#     },
#     {
#       "fileName": "README.md",
#       "author": "Developer Two",
#       "added": 23, "deleted": 22, "total": 45
#     }
#   ]
# }
```
### Output Fields Description

The JSON output contains the following fields:

-   `ai_percentage`: (Number) The percentage of total lines changed (sum of added and deleted lines) that were contributed by AI authors (identified by `AI_MATCHER`).
-   `ai_changes`: (Object) An object detailing the aggregated line changes (lines `added`, `deleted`, and their `total`) made by AI authors.
-   `human_changes`: (Object) An object detailing the aggregated line changes (lines `added`, `deleted`, and their `total`) made by human authors.
-   `details`: (Array of Objects) Provides a detailed breakdown of changes. Each object in the array represents the contribution of a specific `author` to a particular `fileName`, including lines `added`, `deleted`, and the `total` changes for that file by that author.
