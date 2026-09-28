# Contributing to ReelShare

Thank you for your interest in contributing to ReelShare! This document provides guidelines and instructions for contributing.

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Community](#community)

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating. We are committed to providing a friendly, safe, and welcoming environment for all.

## Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm
- Git
- FFmpeg (for video processing features)

### Setting Up Development Environment
1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/reelshare.git
   cd reelshare
   ```

3. **Set up upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/reelshare.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with test credentials
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical production fixes
- `release/*`: Release preparation

### Creating a New Feature
1. **Create a feature branch** from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Test your changes** thoroughly

4. **Commit your changes** with descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add new video processing feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** to `develop` branch

### Bug Fix Workflow
1. **Create a bugfix branch** from `develop`:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b bugfix/issue-description
   ```

2. **Fix the bug** and add tests

3. **Commit with fix type**:
   ```bash
   git commit -m "fix: resolve video upload timeout issue"
   ```

4. **Push and create PR** to `develop`

## Pull Request Process

### Before Submitting
1. **Ensure tests pass**: `npm test`
2. **Run linting**: `npm run lint`
3. **Check TypeScript**: `npm run type-check`
4. **Update documentation** if needed
5. **Add/update tests** for your changes

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code
- [ ] I have added tests
- [ ] All tests pass
- [ ] Documentation has been updated

## Related Issues
Fixes #123

## Screenshots (if applicable)
```

### Review Process
1. **Automated checks** must pass
2. **At least one maintainer** must approve
3. **No merge conflicts**
4. **All feedback addressed**

### After Approval
- Maintainers will merge the PR
- Delete the feature branch
- Changes will be included in next release

## Coding Standards

### TypeScript
- Use strict TypeScript configuration
- No `any` type unless absolutely necessary
- Explicit return types for functions
- Interfaces over types where possible
- Use `const` and `let` appropriately

### React/JSX
- Functional components with hooks
- Type all props with interfaces
- Use destructuring for props
- Keep components focused and small
- Use custom hooks for reusable logic

### Naming Conventions
- **Files**: kebab-case (`my-component.tsx`)
- **Components**: PascalCase (`MyComponent`)
- **Functions/Methods**: camelCase (`myFunction`)
- **Variables/Constants**: camelCase (`myVariable`)
- **Interfaces**: PascalCase (`IMyInterface`)
- **Enums**: PascalCase (`MyEnum`)

### Code Organization
```typescript
// Recommended order in files
1. Imports (external first, then internal)
2. Constants
3. Types/Interfaces
4. Component
5. Styles
6. Exports
```

### Error Handling
- Use try/catch for async operations
- Throw specific error types
- Log errors appropriately
- Provide user-friendly error messages

## Testing

### Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Running Tests
```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Test Coverage Goals
- Statements: 80%+
- Branches: 80%+
- Functions: 80%+
- Lines: 80%+

## Documentation

### Documentation Types
1. **Code Documentation**: JSDoc comments
2. **API Documentation**: TypeScript interfaces
3. **User Documentation**: README, guides
4. **Developer Documentation**: Contributing, architecture

### Writing Documentation
```typescript
/**
 * Uploads a video file to the platform
 * @param file - The video file to upload
 * @param options - Upload options
 * @returns Promise resolving to upload result
 * @throws {UploadError} If upload fails
 * @example
 * const result = await uploadVideo(file, { quality: 'high' });
 */
async function uploadVideo(file: File, options: UploadOptions): Promise<UploadResult> {
  // Implementation
}
```

### Updating Documentation
- Update README for user-facing changes
- Update API docs for API changes
- Update contributing guide for process changes
- Add migration guides for breaking changes

## Community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Discord**: Real-time chat (coming soon)
- **Email**: support@reelshare.app

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information is requested

### Recognition
- Contributors added to CONTRIBUTORS.md
- Special thanks in release notes
- Contributor badges on profiles
- Featured in community spotlight

## Getting Help

### Before Asking
1. Search existing issues and discussions
2. Check documentation
3. Try to reproduce the issue
4. Gather relevant information

### Asking Questions
Provide:
1. What you're trying to accomplish
2. What you've tried
3. Error messages
4. Environment details
5. Code examples

### Response Time
- Critical bugs: 24-48 hours
- Feature requests: 3-5 days
- Questions: 2-3 days
- Documentation: 5-7 days

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you to all contributors who have helped make ReelShare better! Your contributions are greatly appreciated.