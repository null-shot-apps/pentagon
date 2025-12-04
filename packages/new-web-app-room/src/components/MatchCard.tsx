'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { Clock, TrendingUp, Coins } from 'lucide-react';
import { BetModal } from './BetModal';

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

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const { isConnected } = useAccount();
  const [showBetModal, setShowBetModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);

  const formatOdds = (odds: number) => {
    return (odds / 1000).toFixed(2);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'Upcoming';
      case 1: return 'Live';
      case 2: return 'Finished';
      case 3: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 1: return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 2: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case 3: return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const handleBetClick = (outcome: number) => {
    if (!isConnected) return;
    setSelectedOutcome(outcome);
    setShowBetModal(true);
  };

  const getOutcomeName = (outcome: number) => {
    switch (outcome) {
      case 0: return match.homeTeam;
      case 1: return 'Draw';
      case 2: return match.awayTeam;
      default: return 'Unknown';
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
              {getStatusText(match.status)}
            </span>
            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{formatTime(match.startTime)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Coins className="h-4 w-4" />
            <span>{formatEther(match.totalPool)} POL</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {match.homeTeam} vs {match.awayTeam}
          </h3>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-4 w-4" />
            <span>AI-Powered Odds</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Home Win */}
          <button
            onClick={() => handleBetClick(0)}
            disabled={!isConnected || match.status !== 0}
            className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                {match.homeTeam}
              </div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatOdds(match.homeOdds)}x
              </div>
            </div>
          </button>

          {/* Draw */}
          <button
            onClick={() => handleBetClick(1)}
            disabled={!isConnected || match.status !== 0}
            className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 border border-gray-200 dark:border-gray-600 rounded-lg p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Draw
              </div>
              <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                {formatOdds(match.drawOdds)}x
              </div>
            </div>
          </button>

          {/* Away Win */}
          <button
            onClick={() => handleBetClick(2)}
            disabled={!isConnected || match.status !== 0}
            className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                {match.awayTeam}
              </div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatOdds(match.awayOdds)}x
              </div>
            </div>
          </button>
        </div>

        {!isConnected && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Connect wallet to place bets
          </div>
        )}
      </div>

      {showBetModal && selectedOutcome !== null && (
        <BetModal
          match={match}
          outcome={selectedOutcome}
          outcomeName={getOutcomeName(selectedOutcome)}
          odds={selectedOutcome === 0 ? match.homeOdds : selectedOutcome === 1 ? match.drawOdds : match.awayOdds}
          onClose={() => {
            setShowBetModal(false);
            setSelectedOutcome(null);
          }}
        />
      )}
    </>
  );
}

