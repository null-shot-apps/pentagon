'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { footballAPI } from '../lib/football-api';
import { contractIntegration } from '../lib/contract-integration';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface MatchResolverProps {
  onMatchResolved?: (matchId: number, result: number) => void;
}

export function MatchResolver({ onMatchResolved }: MatchResolverProps) {
  const { address } = useAccount();
  const [resolving, setResolving] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [resolvedMatches, setResolvedMatches] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auto-resolve finished matches every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      await checkAndResolveMatches();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial check
    checkAndResolveMatches();

    return () => clearInterval(interval);
  }, []);

  const checkAndResolveMatches = async () => {
    if (resolving) return;

    try {
      setResolving(true);
      setError(null);
      setLastCheck(new Date());

      // 1. Get all contract matches that are not resolved
      const contractMatches = await contractIntegration.getAllMatches();
      const unresolvedMatches = contractMatches.filter(
        match => match.status !== 2 && match.result === 0 // Not finished and not resolved
      );

      if (unresolvedMatches.length === 0) {
        return;
      }

      // 2. Get finished matches from Football API
      const finishedApiMatches = await footballAPI.getFinishedMatches();

      // 3. Match and resolve
      const newlyResolved: number[] = [];

      for (const contractMatch of unresolvedMatches) {
        // Find corresponding API match
        const apiMatch = finishedApiMatches.find(
          fm => fm.homeTeam.name === contractMatch.homeTeam && 
                fm.awayTeam.name === contractMatch.awayTeam &&
                fm.status === 'FINISHED'
        );

        if (apiMatch && apiMatch.score.fullTime.home !== null && apiMatch.score.fullTime.away !== null) {
          // Determine result
          let result: number;
          const homeScore = apiMatch.score.fullTime.home;
          const awayScore = apiMatch.score.fullTime.away;

          if (homeScore > awayScore) {
            result = 1; // HOME_WIN
          } else if (homeScore < awayScore) {
            result = 3; // AWAY_WIN
          } else {
            result = 2; // DRAW
          }

          try {
            // Resolve match in smart contract
            await contractIntegration.resolveMatch(contractMatch.id, result);
            newlyResolved.push(contractMatch.id);
            
            // Notify parent component
            onMatchResolved?.(contractMatch.id, result);
            
            console.log(`Resolved match ${contractMatch.id}: ${contractMatch.homeTeam} ${homeScore}-${awayScore} ${contractMatch.awayTeam}`);
          } catch (error) {
            console.error(`Failed to resolve match ${contractMatch.id}:`, error);
          }
        }
      }

      if (newlyResolved.length > 0) {
        setResolvedMatches(prev => [...prev, ...newlyResolved]);
      }

    } catch (error) {
      console.error('Error checking and resolving matches:', error);
      setError(error instanceof Error ? error.message : 'Failed to resolve matches');
    } finally {
      setResolving(false);
    }
  };

  const handleManualResolve = async () => {
    await checkAndResolveMatches();
  };

  if (!address) {
    return null; // Only show to connected users
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Match Resolution</span>
        </h3>
        <button
          onClick={handleManualResolve}
          disabled={resolving}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {resolving ? 'Checking...' : 'Check Now'}
        </button>
      </div>

      <div className="space-y-3">
        {lastCheck && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
          </div>
        )}

        {resolvedMatches.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-200">
                {resolvedMatches.length} match(es) resolved automatically
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">
                {error}
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>• Matches are automatically resolved when Football API reports final scores</p>
          <p>• Winnings can be claimed after match resolution</p>
          <p>• System checks for new results every 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
