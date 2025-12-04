'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS } from '../lib/wagmi';
import { POL_TOKEN_ABI, PREDICTION_MARKET_ABI } from '../lib/abis';
import { Wallet, TrendingUp, History, Coins } from 'lucide-react';

export function UserDashboard() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: CONTRACTS.POL_TOKEN,
    abi: POL_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: userBets } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getUserBets',
    args: address ? [address] : undefined,
  });

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

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Your Balance</h3>
          <Coins className="h-6 w-6" />
        </div>
        <div className="text-3xl font-bold mb-2">
          {balance ? formatEther(balance) : '0.00'} POL
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
            {userBets ? userBets.length : 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <History className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Bets
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {userBets ? userBets.length : 0}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
          <History className="h-5 w-5" />
          <span>Recent Activity</span>
        </h3>
        
        {!userBets || userBets.length === 0 ? (
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
            {userBets.slice(0, 5).map((betId, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Bet #{betId.toString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Pending result
                  </div>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  Active
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI Insights</span>
        </h3>
        <div className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
          <p>• Manchester United has 45% win probability based on recent form</p>
          <p>• Liverpool&apos;s away record suggests 38% win chance</p>
          <p>• Draw probability calculated at 17% using AI models</p>
        </div>
      </div>
    </div>
  );
}

