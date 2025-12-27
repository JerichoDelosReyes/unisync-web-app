# Contributing to UNISYNC

Thank you for your interest in contributing to UNISYNC! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/unisync-web-app.git
   cd unisync-web-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file based on `.env.example`
5. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `dev` - Development branch for integration
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Branch

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
```

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(auth): add email verification flow
fix(announcements): resolve pagination issue
docs(readme): update installation steps
```

## Pull Request Process

1. Update your branch with the latest `dev`:
   ```bash
   git fetch origin
   git rebase origin/dev
   ```

2. Push your changes:
   ```bash
   git push origin feature/your-feature-name
   ```

3. Create a Pull Request to `dev` branch

4. Ensure your PR:
   - Has a clear title and description
   - References any related issues
   - Passes all CI checks
   - Has no merge conflicts

5. Request review from maintainers

## Code Style

- Use ES6+ JavaScript features
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling
- Keep components small and focused
- Write meaningful variable and function names

### File Naming

- Components: `PascalCase.jsx` (e.g., `UserProfile.jsx`)
- Services: `camelCase.js` (e.g., `authService.js`)
- Utilities: `camelCase.js` (e.g., `formatDate.js`)

## Reporting Issues

When reporting bugs, please include:

- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser and OS information

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

---

Thank you for contributing to UNISYNC! 🎉
