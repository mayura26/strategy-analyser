# Lint, Fix, and Commit

Run ESLint, automatically fix any fixable issues, and commit the changes with a descriptive message.

## What this command does:

1. **Runs ESLint** to check for linting errors and warnings
2. **Automatically fixes** any fixable ESLint issues using `--fix` flag
3. **Shows a summary** of what was fixed and any remaining warnings
4. **Commits the changes** with a descriptive commit message that summarizes the work done
5. **Pushes the commit** to the remote repository
6. **Provides feedback** on any unfixable warnings that need manual attention

## Usage:
Type `/lint-fix-commit` in the Agent input to run this command.

## Commands executed:
```bash
# Run ESLint with fix flag and capture output
npm run lint -- --fix

# Check if there are any changes to commit
git status --porcelain

# If there are changes, commit them with a descriptive message
git add .
git commit -m "fix: resolve ESLint errors and warnings

- Auto-fixed linting issues using ESLint --fix
- Improved code quality and consistency
- Resolved TypeScript and React-specific warnings
- Note: Some warnings may require manual review for React hooks dependencies"

# Push the commit to remote repository
git push
```

## Notes:
- This command will only commit if there are actual changes after linting
- The commit message follows conventional commit format
- Safe to run multiple times - won't create empty commits
- Any unfixable warnings will be displayed for manual review
- Focuses on auto-fixable issues while highlighting manual fixes needed
- Automatically pushes changes to remote repository after committing
- Requires proper git remote configuration and push permissions
