'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MatchCard } from './MatchCard';
import { Clock, TrendingUp } from 'lucide-react';

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  startTime: number;
  status: number;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  totalPool: bigint;
}

export function MatchList() {
  const { isConnected } = useAccount();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // For demo purposes, we'll show the sample match created during deployment
  useEffect(() => {
    const loadMatches = async () => {
      try {
        // In a real app, you'd fetch this from the contract or API
        // For now, we'll show the sample match
        const sampleMatch: Match = {
          id: 1,
          homeTeam: "Manchester United",
          awayTeam: "Liverpool",
          startTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          status: 0, // UPCOMING
          homeOdds: 2500, // 2.5x
          drawOdds: 3200, // 3.2x
          awayOdds: 2800, // 2.8x
          totalPool: BigInt(0)
        };
        
        setMatches([sampleMatch]);
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span>Upcoming Matches</span>
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-4 w-4" />
            <span>AI-Calculated Odds</span>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No matches available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Check back later for upcoming Premier League matches
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Connect your wallet to place bets
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You need to connect a Web3 wallet to participate in the prediction market.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

