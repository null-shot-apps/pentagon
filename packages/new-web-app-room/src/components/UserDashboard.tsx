'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { contractIntegration, UserBet } from '../lib/contract-integration';
import { MatchResolver } from './MatchResolver';
import { Wallet, TrendingUp, History, Coins, Trophy, Clock } from 'lucide-react';

export function UserDashboard() {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [winnings, setWinnings] = useState<bigint>(BigInt(0));

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const [userBalance, bets] = await Promise.all([
          contractIntegration.getUserBalance(address),
          contractIntegration.getUserBets(address),
        ]);

        setBalance(userBalance);
        setUserBets(bets);

        // Calculate potential winnings from active bets
        const totalWinnings = bets
          .filter(bet => !bet.claimed)
          .reduce((sum, bet) => {
            const potentialWin = (bet.amount * BigInt(bet.odds)) / BigInt(1000);
            return sum + potentialWin;
          }, BigInt(0));
        
        setWinnings(totalWinnings);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [address]);

  const handleMatchResolved = () => {
    // Refresh user data when a match is resolved
    if (address) {
      contractIntegration.getUserBets(address).then(setUserBets);
    }
  };

  const handleClaimWinnings = async (matchId: number) => {
    if (!address) return;
    
    try {
      await contractIntegration.claimWinnings(matchId);
      
      // Refresh user data
      const [newBalance, newBets] = await Promise.all([
        contractIntegration.getUserBalance(address),
        contractIntegration.getUserBets(address),
      ]);
      
      setBalance(newBalance);
      setUserBets(newBets);
    } catch (error) {
      console.error('Error claiming winnings:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Connect your wallet to view your dashboard and place bets
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const activeBets = userBets.filter(bet => !bet.claimed);
  const claimableBets = userBets.filter(bet => !bet.claimed); // In real implementation, check if match is resolved and bet won

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Your Balance</h3>
          <Coins className="h-6 w-6" />
        </div>
        <div className="text-3xl font-bold mb-2">
          {formatEther(balance)} POL
        </div>
        <p className="text-blue-100 text-sm">
          Available for betting
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Bets
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeBets.length}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Potential Win
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatEther(winnings)} POL
          </div>
        </div>
      </div>

      {/* Recent Bets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <History className="h-5 w-5" />
          <span>Your Bets</span>
        </h3>
        
        {userBets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No bets placed yet
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Place your first bet to see activity here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userBets.slice(0, 5).map((bet, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Match #{bet.matchId} - {contractIntegration.getBetTypeString(bet.betType)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatEther(bet.amount)} POL @ {(bet.odds / 1000).toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(bet.timestamp * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {bet.claimed ? (
                    <span className="text-sm text-green-600 dark:text-green-400">Claimed</span>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-yellow-600" />
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Resolution System */}
      <MatchResolver onMatchResolved={handleMatchResolved} />

      {/* Claimable Winnings */}
      {claimableBets.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Claimable Winnings</span>
          </h3>
          <div className="space-y-3">
            {claimableBets.map((bet, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-800/20 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-green-900 dark:text-green-100">
                    Match #{bet.matchId} - {contractIntegration.getBetTypeString(bet.betType)}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    Potential winnings: {formatEther((bet.amount * BigInt(bet.odds)) / BigInt(1000))} POL
                  </div>
                </div>
                <button
                  onClick={() => handleClaimWinnings(bet.matchId)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




