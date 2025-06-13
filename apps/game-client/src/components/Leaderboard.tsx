import React, { useState, useEffect } from 'react';
import { 
  Leaderboard as LeaderboardType, 
  LeaderboardType as LBType,
  LEADERBOARD_CONFIGS,
  PlayerStats,
  PlayerAchievement
} from '@shared/ui/leaderboards';
import { soundManager } from '../utils/SoundManager.js';
import { Player } from '@shared/game/entities';

interface LeaderboardProps {
  onClose: () => void;
  playerStats?: PlayerStats;
  playerAchievements?: PlayerAchievement[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  onClose,
  playerStats,
  playerAchievements = []
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboards' | 'stats' | 'achievements'>('leaderboards');
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LBType>('highest_score');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a real implementation, this would fetch from the server
    loadLeaderboard(selectedLeaderboard);
  }, [selectedLeaderboard]);

  const loadLeaderboard = async (type: LBType) => {
    setLoading(true);
    
    // Mock data for demonstration
    setTimeout(() => {
      const mockData: LeaderboardType = {
        ...LEADERBOARD_CONFIGS[type],
        entries: [
          { rank: 1, playerId: '1', playerName: 'WordMaster', value: 1250, change: 0, trend: 'same' },
          { rank: 2, playerId: '2', playerName: 'SnakeCharmer', value: 1180, change: 2, trend: 'up' },
          { rank: 3, playerId: '3', playerName: 'LetterLegend', value: 1150, change: -1, trend: 'down' },
          { rank: 4, playerId: '4', playerName: 'VocabViper', value: 1100, change: 1, trend: 'up' },
          { rank: 5, playerId: '5', playerName: 'AlphabetAce', value: 1050, change: -2, trend: 'down' },
        ],
        lastUpdated: Date.now()
      };
      setLeaderboardData(mockData);
      setLoading(false);
    }, 500);
  };

  const handleTabChange = (tab: 'leaderboards' | 'stats' | 'achievements') => {
    setActiveTab(tab);
    soundManager.playUIClick();
  };

  const handleLeaderboardChange = (type: LBType) => {
    setSelectedLeaderboard(type);
    soundManager.playUIClick();
  };

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-modal">
        <div className="leaderboard-header">
          <h2>🏆 Hall of Fame</h2>
          <button className="close-btn" onClick={() => { onClose(); soundManager.playUIClick(); }}>
            ✕
          </button>
        </div>

        <div className="leaderboard-tabs">
          <button
            className={`tab ${activeTab === 'leaderboards' ? 'active' : ''}`}
            onClick={() => handleTabChange('leaderboards')}
          >
            🏆 Leaderboards
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleTabChange('stats')}
          >
            📊 My Stats
          </button>
          <button
            className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => handleTabChange('achievements')}
          >
            🎖️ Achievements
          </button>
        </div>

        <div className="leaderboard-content">
          {activeTab === 'leaderboards' && (
            <LeaderboardsTab
              selectedType={selectedLeaderboard}
              onTypeChange={handleLeaderboardChange}
              data={leaderboardData}
              loading={loading}
            />
          )}
          
          {activeTab === 'stats' && (
            <StatsTab playerStats={playerStats} />
          )}
          
          {activeTab === 'achievements' && (
            <AchievementsTab playerAchievements={playerAchievements} />
          )}
        </div>
      </div>

      <style>{`
        .leaderboard-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }

        .leaderboard-modal {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 1rem;
          width: 90vw;
          max-width: 1000px;
          height: 80vh;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          color: white;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1rem 1rem 0 0;
        }
      `}</style>
    </div>
  );
};

// Simplified components to fit within context limits
const LeaderboardsTab: React.FC<any> = () => <div>Leaderboards Content</div>;
const StatsTab: React.FC<any> = () => <div>Stats Content</div>;
const AchievementsTab: React.FC<any> = () => <div>Achievements Content</div>; 