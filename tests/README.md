# Unit Tests for Masa Subnet 42 MCP Server

This directory contains unit tests for the Masa Subnet 42 MCP Server project.

## Structure

```
tests/
├── mocks/              # Mocks for external dependencies
├── services/           # Tests for services (MasaService, BittensorService, etc.)
├── tools/              # Tests for MCP tools (Twitter, Data Indexing, Bittensor, etc.)
├── utils/              # Tests for utilities (helpers, logger, etc.)
├── server/             # Tests for server components
└── resources/          # Tests for MCP resources
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage report

```bash
npm run test:coverage
```

The coverage report will be generated in the `coverage/` directory.

## Configuration

Test configuration is located in the `jest.config.js` file at the root of the project.

## Mocks

We use mocks to simulate external dependencies such as environment variables, loggers, and external services. Mock files are located in the `tests/mocks/` directory.

## Tips for Writing Tests

1. **Isolate tests**: Each test should be independent from the others.
2. **Mock external dependencies**: Use `jest.mock()` to simulate external modules.
3. **Test error scenarios**: Make sure to cover edge cases and failure conditions.
4. **Use `beforeEach` and `afterEach`**: To reset state between tests.
5. **Keep tests focused**: Each test should validate one specific behavior.

## Examples

Refer to the existing tests for examples of how to write tests for different types of components.
