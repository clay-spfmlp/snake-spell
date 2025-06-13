import { MultiplayerGameEngine } from './MultiplayerGameEngine.js';
import { GameRoom, RoomPlayer, DIRECTIONS, LetterTile } from '@snake-word-arena/shared-types';

// Final comprehensive test for all crossword game rules
console.log('🎯 FINAL CROSSWORD GAME RULES VALIDATION\n');
console.log('========================================\n');

interface TestResult {
  rule: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function addTestResult(rule: string, passed: boolean, details: string) {
  testResults.push({ rule, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${rule}`);
  console.log(`   ${details}\n`);
}

// Create a test room
const testRoom: GameRoom = {
  id: 'test-room',
  name: 'Test Room',
  code: 'TEST',
  gameMode: 'crossword_search',
  hostPlayerId: 'player1',
  players: [
    {
      id: 'player1',
      name: 'Alice',
      isReady: true,
      isAlive: true,
      joinedAt: Date.now(),
      color: '#FF0000'
    },
    {
      id: 'player2',
      name: 'Bob',
      isReady: true,
      isAlive: true,
      joinedAt: Date.now(),
      color: '#0000FF'
    }
  ],
  maxPlayers: 4,
  isGameActive: false,
  isPrivate: false,
  createdAt: Date.now(),
  gameState: {
    isActive: false,
    snakes: [],
    foods: [],
    letterTiles: [],
    gameTime: 0,
    config: {
      canvasWidth: 800,
      canvasHeight: 600,
      gridSize: 20,
      gameSpeed: 200,
      initialSnakeLength: 3,
      foodSpawnRate: 2
    },
    playerInventories: new Map()
  }
};

// Mock callbacks
let gameStateUpdates = 0;
let crosswordStateUpdates = 0;
let gameEnded = false;
let winner: string | undefined;

const mockGameStateUpdate = (gameState: any) => {
  gameStateUpdates++;
};

const mockGameEnd = (winnerName?: string, scores?: any[]) => {
  gameEnded = true;
  winner = winnerName;
};

const mockCrosswordStateUpdate = (crosswordState: any) => {
  crosswordStateUpdates++;
};

// Create game engine
console.log('🔧 Initializing game engine...\n');
const gameEngine = new MultiplayerGameEngine(
  testRoom,
  mockGameStateUpdate,
  mockGameEnd,
  mockCrosswordStateUpdate
);

// Rule 1: All players work on same clue
console.log('Testing Rule 1: All players work on same clue');
const crosswordState = testRoom.crosswordState!;
const player1Progress = crosswordState.playerProgress.get('player1')!;
const player2Progress = crosswordState.playerProgress.get('player2')!;

addTestResult(
  'Rule 1: All players work on same clue',
  player1Progress.currentClueIndex === player2Progress.currentClueIndex,
  `Player 1 clue index: ${player1Progress.currentClueIndex}, Player 2 clue index: ${player2Progress.currentClueIndex}`
);

// Rule 2: Letters spawn correctly with correct letter included
console.log('Testing Rule 2: Letters spawn correctly');
const firstClue = crosswordState.currentClues[0];
const nextCorrectLetter = firstClue.answer[0];
const hasCorrectLetter = crosswordState.availableLetters.includes(nextCorrectLetter);

addTestResult(
  'Rule 2: Letters spawn with correct letter included',
  hasCorrectLetter && crosswordState.availableLetters.length === 10,
  `Available letters: [${crosswordState.availableLetters.join(', ')}], Next correct: "${nextCorrectLetter}", Included: ${hasCorrectLetter}`
);

// Rule 3: Collect letters in sequence (correct letter advances progress)
console.log('Testing Rule 3: Collect letters in sequence');
gameEngine.start();

const snake = testRoom.gameState.snakes[0];
const initialLetterIndex = player1Progress.currentLetterIndex;

// Find and collect correct letter
const correctTile = testRoom.gameState.letterTiles.find(tile => tile.letter === nextCorrectLetter);
if (correctTile) {
  snake.segments[0].position = { ...correctTile.position };
  (gameEngine as any).handleCrosswordLetterCollection('player1', correctTile);
}

const advancedCorrectly = player1Progress.currentLetterIndex === initialLetterIndex + 1;
addTestResult(
  'Rule 3: Correct letter advances progress',
  advancedCorrectly,
  `Initial index: ${initialLetterIndex}, After correct letter: ${player1Progress.currentLetterIndex}`
);

// Rule 4: Wrong letter shrinks snake
console.log('Testing Rule 4: Wrong letter shrinks snake');
const initialSnakeLength = snake.segments.length;
const wrongLetter = crosswordState.availableLetters.find(letter => 
  letter !== firstClue.answer[player1Progress.currentLetterIndex]
);

if (wrongLetter) {
  const wrongTile: LetterTile = {
    id: 'wrong-tile',
    letter: wrongLetter,
    position: { x: 10, y: 10 },
    points: 1,
    rarity: 'common'
  };
  
  (gameEngine as any).handleCrosswordLetterCollection('player1', wrongTile);
}

const snakeShrunk = snake.segments.length < initialSnakeLength;
addTestResult(
  'Rule 4: Wrong letter shrinks snake',
  snakeShrunk,
  `Initial length: ${initialSnakeLength}, After wrong letter: ${snake.segments.length}`
);

// Rule 5: Snake dies when too small
console.log('Testing Rule 5: Snake dies when too small');
// Shrink snake to 1 segment
while (snake.segments.length > 1) {
  snake.segments.pop();
}

const player = testRoom.players[0];
const wasAlive = snake.isAlive && player.isAlive;

// Collect another wrong letter to kill snake
if (wrongLetter) {
  const wrongTile: LetterTile = {
    id: 'wrong-tile-2',
    letter: wrongLetter,
    position: { x: 11, y: 10 },
    points: 1,
    rarity: 'common'
  };
  
  (gameEngine as any).handleCrosswordLetterCollection('player1', wrongTile);
}

const snakeDied = !snake.isAlive && !player.isAlive;
addTestResult(
  'Rule 5: Snake dies when too small',
  wasAlive && snakeDied,
  `Was alive: ${wasAlive}, Died after wrong letter: ${snakeDied}`
);

// Rule 6: Game continues after death in crossword mode
console.log('Testing Rule 6: Game continues after death in crossword mode');
const gameStillActive = testRoom.gameState.isActive && !gameEnded;
addTestResult(
  'Rule 6: Game continues after death in crossword mode',
  gameStillActive,
  `Game active: ${testRoom.gameState.isActive}, Game ended: ${gameEnded}`
);

// Rule 7: Letters respawn after collection
console.log('Testing Rule 7: Letters respawn after collection');
const letterTilesCount = testRoom.gameState.letterTiles.length;
addTestResult(
  'Rule 7: Letters respawn after collection',
  letterTilesCount === 10,
  `Letter tiles on board: ${letterTilesCount}/10`
);

// Rule 8: NextCorrectLetter updates properly
console.log('Testing Rule 8: NextCorrectLetter updates correctly');
const currentExpectedLetter = firstClue.answer[player1Progress.currentLetterIndex];
const nextCorrectLetterMatches = crosswordState.nextCorrectLetter === currentExpectedLetter;
addTestResult(
  'Rule 8: NextCorrectLetter updates correctly',
  nextCorrectLetterMatches,
  `Expected: "${currentExpectedLetter}", NextCorrectLetter: "${crosswordState.nextCorrectLetter}"`
);

gameEngine.stop();

// Generate final report
console.log('\n========================================');
console.log('🎯 FINAL TEST REPORT');
console.log('========================================\n');

const passedTests = testResults.filter(r => r.passed).length;
const totalTests = testResults.length;
const passRate = Math.round((passedTests / totalTests) * 100);

console.log(`📊 Test Results: ${passedTests}/${totalTests} passed (${passRate}%)\n`);

console.log('📋 Detailed Results:');
testResults.forEach((result, index) => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${result.rule}`);
  console.log(`   ${result.details}`);
});

console.log('\n🎮 Game Statistics:');
console.log(`   Game state updates: ${gameStateUpdates}`);
console.log(`   Crossword state updates: ${crosswordStateUpdates}`);
console.log(`   Game ended: ${gameEnded}`);
if (winner) {
  console.log(`   Winner: ${winner}`);
}

console.log('\n🎯 Crossword Game State:');
console.log(`   Total clues: ${crosswordState.currentClues.length}`);
console.log(`   Available letters: ${crosswordState.availableLetters.length}`);
console.log(`   Players with progress: ${crosswordState.playerProgress.size}`);
console.log(`   Current clue: "${firstClue.clue}"`);
console.log(`   Answer: "${firstClue.answer}"`);

if (passedTests === totalTests) {
  console.log('\n🎉 ALL TESTS PASSED! The crossword game rules are working correctly.');
} else {
  console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Please review the failing rules.`);
}

console.log('\n✨ Final validation complete!'); 