# 🧪 Testing Guide

## Overview

Our testing setup uses **Vitest** as the test runner with comprehensive coverage for all packages in the monorepo.

## Test Architecture

```
tests/
├── packages/shared-types/     # Type validation tests
├── apps/game-client/         # React component & hook tests  
└── apps/game-server/         # Server logic tests
```

## Testing Stack

- **Vitest**: Fast test runner with TypeScript support
- **React Testing Library**: Component testing utilities
- **jsdom**: Browser environment simulation
- **@vitest/coverage-v8**: Code coverage reporting

## Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run all tests once
pnpm test:run

# Run with coverage report
pnpm test:coverage

# Run tests for specific package
cd apps/game-client && pnpm test:run
```

## Current Test Coverage

- **18 tests passing** across the entire monorepo
- **51.53% overall coverage** in the client package
- **95.12% coverage** in the game store (excellent!)

### Test Breakdown

1. **Shared Types (4 tests)**
   - Message structure validation
   - Type correctness checks

2. **Game Store (9 tests)**
   - Connection state management
   - Player management
   - Chat functionality
   - Reset behavior

3. **React Components (3 tests)**
   - UI rendering
   - Form interactions
   - Connection status display

4. **Server Logic (2 tests)**
   - Basic functionality tests
   - Type handling validation

## Test Patterns

### Type Testing
```typescript
import { describe, it, expect } from 'vitest'

describe('Message Types', () => {
  it('should have correct structure', () => {
    const message: ConnectMessage = {
      type: 'connect',
      data: { playerName: 'TestPlayer' },
      timestamp: Date.now()
    }
    
    expect(message.type).toBe('connect')
    expect(message.data.playerName).toBe('TestPlayer')
  })
})
```

### Store Testing
```typescript
import { useGameStore } from './gameStore'

describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })
  
  it('should update connection status', () => {
    const { setConnectionStatus } = useGameStore.getState()
    setConnectionStatus('Open')
    expect(useGameStore.getState().isConnected).toBe(true)
  })
})
```

### Component Testing
```typescript
import { render, screen } from '@testing-library/react'
import { GameClient } from './GameClient'

describe('GameClient', () => {
  it('should render the title', () => {
    render(<GameClient />)
    expect(screen.getByText('🐍 Snake Word Arena')).toBeInTheDocument()
  })
})
```

## Configuration

Each package has its own `vitest.config.ts`:

- **Shared Types**: Node environment for type testing
- **Game Server**: Node environment with path aliases
- **Game Client**: jsdom environment with React support

## Best Practices

1. **Reset state** between tests using `beforeEach`
2. **Mock WebSocket** in browser environment
3. **Test behavior, not implementation**
4. **Use descriptive test names**
5. **Group related tests** with `describe` blocks

## Future Improvements

- [ ] Add integration tests for WebSocket communication
- [ ] Increase server-side test coverage
- [ ] Add performance tests for game logic
- [ ] Set up CI/CD pipeline with test automation
- [ ] Add visual regression tests for UI components

## Troubleshooting

### Common Issues

**TypeScript errors in tests:**
- Ensure all dependencies are installed: `pnpm install`
- Check `vitest.config.ts` has correct path aliases

**WebSocket mocking:**
- Tests use mocked WebSocket from `src/test/setup.ts`
- Real WebSocket connections are avoided in test environment

**Coverage not generating:**
- Run `pnpm test:coverage` instead of `pnpm test:run`
- Check that `@vitest/coverage-v8` is installed

---

**Status**: ✅ Full test suite operational | Ready for Phase 2 development 