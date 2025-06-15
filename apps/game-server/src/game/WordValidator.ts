import { 
  WordValidationResult, 
  CollectedLetter, 
  WORD_LENGTH_BONUSES,
  LETTER_FREQUENCIES 
} from '@snake-spell/shared-types';

export class WordValidator {
  private dictionary: Set<string>;

  constructor() {
    this.dictionary = new Set();
    this.initializeBasicDictionary();
  }

  private initializeBasicDictionary(): void {
    // Basic dictionary with common English words
    const basicWords = [
      // 3-letter words
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR',
      'HAD', 'DID', 'GET', 'HAS', 'HIM', 'OLD', 'HOW', 'NOW', 'NEW', 'MAY', 'WAY', 'WHO', 'BOY',
      'SHE', 'HIS', 'TWO', 'SEE', 'USE', 'OUT', 'DAY', 'GOT', 'MAN', 'END', 'WHY', 'LET', 'PUT',
      'TOO', 'BIG', 'RUN', 'TOP', 'CUT', 'TRY', 'WIN', 'CAR', 'EAT', 'SUN', 'SET', 'RED', 'HOT',
      'LEG', 'BAD', 'BAG', 'YES', 'SIT', 'DOG', 'CAT', 'COW', 'PIG', 'BEE', 'EGG', 'CUP', 'BOX',
      
      // 4-letter words
      'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'KNOW', 'WANT', 'BEEN', 
      'GOOD', 'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST', 'LIKE', 'LONG',
      'MAKE', 'MANY', 'OVER', 'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL', 'WERE', 'WHAT', 'YEAR',
      'WORK', 'EACH', 'CALL', 'CAME', 'PLAY', 'LOOK', 'HELP', 'TURN', 'HAND', 'FIND', 'GIVE',
      'TELL', 'PART', 'MADE', 'LIVE', 'BACK', 'ONLY', 'WORD', 'DOWN', 'ALSO', 'EVEN', 'MOST',
      'GAME', 'BOOK', 'TEAM', 'FOOD', 'TREE', 'FISH', 'BIRD', 'ROCK', 'MOON', 'STAR', 'FIRE',
      
      // 5-letter words
      'WHICH', 'THEIR', 'WOULD', 'THERE', 'COULD', 'OTHER', 'AFTER', 'FIRST', 'NEVER', 'THESE',
      'THINK', 'WHERE', 'BEING', 'EVERY', 'GREAT', 'MIGHT', 'SHALL', 'STILL', 'THOSE', 'WHILE',
      'ABOUT', 'AGAIN', 'PLACE', 'RIGHT', 'WATER', 'SMALL', 'SOUND', 'STILL', 'LEARN', 'WORLD',
      'BELOW', 'HOUSE', 'LIGHT', 'PLANT', 'POINT', 'SPELL', 'FOUND', 'STUDY', 'EARTH', 'HEART',
      'MUSIC', 'HORSE', 'MONEY', 'PAPER', 'STORY', 'WATCH', 'PARTY', 'DANCE', 'MAGIC', 'QUICK',
      
      // 6+ letter words
      'SHOULD', 'AROUND', 'THROUGH', 'PEOPLE', 'REALLY', 'SCHOOL', 'LITTLE', 'BEFORE', 'ALWAYS',
      'ANOTHER', 'BECAUSE', 'SOMETHING', 'DIFFERENT', 'BETWEEN', 'IMPORTANT', 'EXAMPLE', 'CHANGE',
      'QUESTION', 'FRIEND', 'FAMILY', 'SYSTEM', 'COMPUTER', 'PROGRAM', 'LETTER', 'NUMBER', 'ANIMAL',
      'BEAUTIFUL', 'WONDERFUL', 'AMAZING', 'FANTASTIC', 'EXCELLENT', 'PERFECT', 'AWESOME', 'INCREDIBLE'
    ];

    basicWords.forEach(word => {
      this.dictionary.add(word.toUpperCase());
    });

    console.log(`📚 Dictionary initialized with ${this.dictionary.size} words`);
  }

  public validateWord(letters: CollectedLetter[]): WordValidationResult {
    const word = letters.map(l => l.letter).join('').toUpperCase();
    const isValid = this.dictionary.has(word);

    if (!isValid) {
      return {
        isValid: false,
        word,
        basePoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
        reason: 'Word not found in dictionary'
      };
    }

    // Calculate base points from letter values
    const basePoints = letters.reduce((sum, letter) => {
      const letterData = LETTER_FREQUENCIES.find(l => l.letter === letter.letter);
      return sum + (letterData?.points || 1);
    }, 0);

    // Calculate length bonus
    const lengthBonus = this.getWordLengthBonus(word.length);
    
    // Calculate rarity bonus (based on rare letters used)
    const rarityBonus = this.getRarityBonus(letters);
    
    const bonusPoints = lengthBonus + rarityBonus;
    const totalPoints = basePoints + bonusPoints;

    return {
      isValid: true,
      word,
      basePoints,
      bonusPoints,
      totalPoints
    };
  }

  private getWordLengthBonus(length: number): number {
    if (length >= 10) return WORD_LENGTH_BONUSES[10];
    return WORD_LENGTH_BONUSES[length as keyof typeof WORD_LENGTH_BONUSES] || 0;
  }

  private getRarityBonus(letters: CollectedLetter[]): number {
    let bonus = 0;
    
    letters.forEach(letter => {
      const letterData = LETTER_FREQUENCIES.find(l => l.letter === letter.letter);
      if (letterData) {
        switch (letterData.rarity) {
          case 'rare':
            bonus += 5;
            break;
          case 'epic':
            bonus += 15;
            break;
          default:
            break;
        }
      }
    });

    return bonus;
  }

  public addWord(word: string): void {
    this.dictionary.add(word.toUpperCase());
  }

  public hasWord(word: string): boolean {
    return this.dictionary.has(word.toUpperCase());
  }

  public getDictionarySize(): number {
    return this.dictionary.size;
  }
} 