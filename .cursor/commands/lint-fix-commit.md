# Lint, Fix, and Commit with Context

Run ESLint, automatically fix any fixable issues, and commit the changes with a descriptive message that includes context from the current chat session.

## What this command does:

1. **Captures context** about changes made in the current chat session
2. **Runs ESLint** to check for linting errors and warnings
3. **Automatically fixes** any fixable ESLint issues using `--fix` flag
4. **Shows a summary** of what was fixed and any remaining warnings
5. **Analyzes changes** made during the linting process
6. **Commits the changes** with a descriptive commit message that includes chat context
7. **Pushes the commit** to the remote repository
8. **Provides feedback** on any unfixable warnings that need manual attention

## Usage:
Type `/lint-fix-commit` in the Agent input to run this command.

## Context Capture:
Before running the linting workflow, this command will attempt to capture context about the changes made in this chat session. If automatic context capture fails, it will prompt you to provide a summary.

**Context Summary (auto-generated or manual):**
- **Main changes**: [What was implemented/modified in this chat]
- **Files affected**: [Key files that were changed]
- **Purpose**: [Goal of this work session]
- **Features added**: [New functionality implemented]

## Commands executed:
```bash
# Step 1: Capture context from chat session
# (This will be filled based on the conversation context or user input)

# Step 2: Run ESLint with fix flag and capture output
npm run lint -- --fix

# Step 3: Check if there are any changes to commit
git status --porcelain

# Step 4: Analyze what changes were made (if any)
git diff --cached

# Step 5: If there are changes, commit them with context-aware message
git add .
git commit -m "feat: [CONTEXT FROM CHAT] + fix ESLint issues

- [Main changes from chat session]
- [Files affected in chat session]
- Auto-fixed linting issues using ESLint --fix
- Improved code quality and consistency
- Resolved TypeScript and React-specific warnings
- Note: Some warnings may require manual review for React hooks dependencies"

# Step 6: Push the commit to remote repository
git push
```

## Notes:
- This command will only commit if there are actual changes after linting
- The commit message follows conventional commit format with chat context
- Safe to run multiple times - won't create empty commits
- Any unfixable warnings will be displayed for manual review
- Focuses on auto-fixable issues while highlighting manual fixes needed
- Automatically pushes changes to remote repository after committing
- Requires proper git remote configuration and push permissions
- Analyzes and shows what specific changes were made during the linting process
- **Context-aware**: Attempts to capture chat session context for better commit messages
- **Fallback**: If automatic context capture fails, will prompt user for summary
- Provides comprehensive context about both chat work and linting fixes in commit message
