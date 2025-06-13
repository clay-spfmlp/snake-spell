import React, { useState } from 'react';
import { PlayerWordInventory, LETTER_COLORS } from '@snake-word-arena/shared-types';

interface WordInventoryProps {
  inventory: PlayerWordInventory;
  onSubmitWord: (letters: string[]) => void;
  onClearLetters: () => void;
  disabled?: boolean;
}

export const WordInventory: React.FC<WordInventoryProps> = ({
  inventory,
  onSubmitWord,
  onClearLetters,
  disabled = false
}) => {
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  const handleLetterClick = (letter: string, index: number) => {
    if (disabled) return;
    
    const newSelected = [...selectedLetters, letter];
    setSelectedLetters(newSelected);
  };

  const handleSubmitWord = () => {
    if (selectedLetters.length < 3) return;
    onSubmitWord(selectedLetters);
    setSelectedLetters([]);
  };

  const handleClearSelection = () => {
    setSelectedLetters([]);
  };

  const handleClearAll = () => {
    onClearLetters();
    setSelectedLetters([]);
  };

  const getLetterColor = (letter: string): string => {
    // Basic color coding - could be enhanced with actual rarity data
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    const rareLetters = ['Q', 'X', 'Z', 'J'];
    const uncommonLetters = ['V', 'K', 'W', 'Y'];
    
    if (rareLetters.includes(letter)) return LETTER_COLORS.epic;
    if (uncommonLetters.includes(letter)) return LETTER_COLORS.rare;
    if (vowels.includes(letter)) return LETTER_COLORS.uncommon;
    return LETTER_COLORS.common;
  };

  const canSubmitWord = selectedLetters.length >= 3 && !disabled;
  const currentWord = selectedLetters.join('');

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Word Inventory</h3>
        <div className="text-sm opacity-80 mb-2">
          Score: {inventory.totalScore} | Letters: {inventory.collectedLetters.length}
        </div>
      </div>

      {/* Collected Letters */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Available Letters:</h4>
        <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-gray-700 rounded">
          {inventory.collectedLetters.length === 0 ? (
            <div className="text-sm opacity-60 flex items-center">
              Collect letters by eating them with your snake!
            </div>
          ) : (
            inventory.collectedLetters.map((collectedLetter, index) => (
              <button
                key={`${collectedLetter.fromTileId}-${index}`}
                onClick={() => handleLetterClick(collectedLetter.letter, index)}
                disabled={disabled}
                className={`
                  w-10 h-10 rounded font-bold text-white border-2 transition-all
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}
                  ${selectedLetters.includes(collectedLetter.letter) ? 'ring-2 ring-yellow-400' : ''}
                `}
                style={{ 
                  backgroundColor: getLetterColor(collectedLetter.letter),
                  borderColor: 'rgba(255,255,255,0.3)'
                }}
                title={`${collectedLetter.letter} (${collectedLetter.points} pts)`}
              >
                {collectedLetter.letter}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Current Word Building */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Building Word:</h4>
        <div className="bg-gray-700 rounded p-3 min-h-[60px] flex items-center">
          {selectedLetters.length === 0 ? (
            <span className="text-sm opacity-60">Click letters above to build a word...</span>
          ) : (
            <div className="flex gap-2">
              {selectedLetters.map((letter, index) => (
                <div
                  key={index}
                  className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-bold border-2 border-blue-400"
                >
                  {letter}
                </div>
              ))}
              <div className="ml-4 flex items-center">
                <span className="text-lg font-mono">{currentWord}</span>
                <span className="ml-2 text-sm opacity-60">
                  ({selectedLetters.length} letters)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmitWord}
          disabled={!canSubmitWord}
          className={`
            flex-1 py-2 px-4 rounded font-semibold transition-colors
            ${canSubmitWord 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Submit Word {selectedLetters.length >= 3 && `(${currentWord})`}
        </button>
        
        <button
          onClick={handleClearSelection}
          disabled={selectedLetters.length === 0 || disabled}
          className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded transition-colors"
        >
          Clear
        </button>
        
        <button
          onClick={handleClearAll}
          disabled={inventory.collectedLetters.length === 0 || disabled}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Completed Words */}
      {inventory.completedWords.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Completed Words:</h4>
          <div className="bg-gray-700 rounded p-2 max-h-32 overflow-y-auto">
            {inventory.completedWords.slice(-5).map((word, index) => (
              <div key={index} className="flex justify-between items-center text-sm py-1">
                <span className={`font-mono ${word.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {word.word.toUpperCase()}
                </span>
                <span className="text-yellow-400">+{word.points}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs opacity-60">
        <p>• Collect letters by moving your snake over them</p>
        <p>• Form words with 3+ letters to score points</p>
        <p>• Longer words and rare letters give bonus points</p>
      </div>
    </div>
  );
}; 