# 🐍 Snake Spell

A multiplayer browser-based Snake game with word collection mechanics. Built with modern web technologies in a Turborepo monorepo.

## 🚀 Phase 1: Basic Infrastructure ✅

**Current Status**: Basic client-server connection with chat functionality + Complete test suite

### Features Implemented
- ✅ Turborepo + pnpm monorepo setup
- ✅ WebSocket client-server connection
- ✅ Player connection/disconnection
- ✅ Real-time chat system
- ✅ Modern UI with Tailwind CSS v4
- ✅ TypeScript throughout
- ✅ Shared types between client and server
- ✅ **Vitest test suite with coverage**
- ✅ **React Testing Library for component tests**
- ✅ **Unit tests for stores and utilities**

## 🛠️ Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4
- **Backend**: Node.js + Express + WebSocket (ws)
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library + Coverage Reports
- **Monorepo**: Turborepo + pnpm
- **Shared**: TypeScript types across packages

## 📁 Project Structure

```
snake-spell/
├── apps/
│   ├── game-client/          # React frontend
│   └── game-server/          # Node.js backend
├── packages/
│   └── shared-types/         # Shared TypeScript types
├── turbo.json               # Turborepo config
├── pnpm-workspace.yaml      # pnpm workspace config
└── package.json             # Root package.json
```

## 🏗️ Setup & Development

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo>
   cd snake-spell
   pnpm install
   ```

2. **Start development servers**:
   ```bash
   pnpm dev
   ```

   This starts:
   - Game client on `http://localhost:3000`
   - Game server on `http://localhost:3001`
   - WebSocket server on `ws://localhost:3002`

### Individual Commands

- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run all tests once
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm clean` - Clean all build artifacts

## 🎮 How to Test Phase 1

### Manual Testing
1. Start the development servers: `pnpm dev`
2. Open multiple browser tabs to `http://localhost:3000`
3. Enter different player names and connect
4. Test the real-time chat functionality
5. Observe players joining/leaving in the player list

### Automated Testing
- `pnpm test:run` - Run the complete test suite (18 tests passing)
- `pnpm test:coverage` - View test coverage reports
- Tests include:
  - **Shared Types**: Message structure validation (4 tests)
  - **Game Store**: State management logic (9 tests)  
  - **React Components**: UI rendering and interaction (3 tests)
  - **Server Logic**: Basic server functionality (2 tests)

## 🚧 Next Phases

### Phase 2: Single-Player Snake Game
- Canvas-based game rendering
- Snake movement and controls
- Food collection mechanics
- Game loop and collision detection

### Phase 3: Multiplayer Foundation
- Multi-snake rendering
- Server-authoritative game state
- Real-time game synchronization

### Phase 4: Word Collection Mechanics
- Letter tiles instead of food
- Word formation system
- Dictionary validation
- Scoring system

## 🐛 Known Issues

- Some TypeScript linting errors are expected until dependencies are installed
- WebSocket connection might need manual refresh if server restarts

## 📊 Performance Notes

- Current setup supports 24+ concurrent players
- WebSocket heartbeat keeps connections alive
- Auto-reconnection implemented for client stability

---

**Status**: Phase 1 Complete ✅ | Ready for Phase 2 🚀 