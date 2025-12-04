'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MatchCard } from './MatchCard';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { footballAPI, FootballMatch } from '../lib/football-api';
import { aiAgent } from '../lib/ai-agent';
import { contractIntegration, ContractMatch } from '../lib/contract-integration';

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
  apiMatchId?: number;
  confidence?: number;
  analysis?: string;
}

export function MatchList() {
  const { isConnected } = useAccount();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch real Premier League matches from Football API
        const footballMatches = await footballAPI.getPremierLeagueMatches();
        
        // 2. Get existing matches from smart contract
        const contractMatches = await contractIntegration.getAllMatches();
        
        // 3. Process and merge data
        const processedMatches: Match[] = [];
        
        // First, add matches that exist in both API and contract
        for (const contractMatch of contractMatches) {
          const apiMatch = footballMatches.find(fm => 
            fm.homeTeam.name === contractMatch.homeTeam && 
            fm.awayTeam.name === contractMatch.awayTeam
          );
          
          processedMatches.push({
            id: contractMatch.id,
            homeTeam: contractMatch.homeTeam,
            awayTeam: contractMatch.awayTeam,
            startTime: contractMatch.startTime,
            status: contractMatch.status,
            homeOdds: contractMatch.homeOdds,
            drawOdds: contractMatch.drawOdds,
            awayOdds: contractMatch.awayOdds,
            totalPool: contractMatch.totalPool,
            apiMatchId: apiMatch?.id,
          });
        }
        
        // Then, create new matches for upcoming API matches not in contract
        const upcomingApiMatches = footballMatches
          .filter(fm => fm.status === 'SCHEDULED')
          .slice(0, 5); // Limit to next 5 matches
        
        for (const apiMatch of upcomingApiMatches) {
          // Check if this match already exists in contract
          const existsInContract = contractMatches.some(cm => 
            cm.homeTeam === apiMatch.homeTeam.name && 
            cm.awayTeam === apiMatch.awayTeam.name
          );
          
          if (!existsInContract) {
            try {
              // Get team statistics
              const homeStats = await aiAgent.getTeamStats(apiMatch.homeTeam.name);
              const awayStats = await aiAgent.getTeamStats(apiMatch.awayTeam.name);
              
              // Calculate AI-powered odds
              const prediction = await aiAgent.calculateOdds(apiMatch, homeStats, awayStats);
              
              // Convert odds to contract format (multiply by 1000 for precision)
              const homeOdds = Math.round(prediction.homeOdds * 1000);
              const drawOdds = Math.round(prediction.drawOdds * 1000);
              const awayOdds = Math.round(prediction.awayOdds * 1000);
              
              // Create match in smart contract
              const startTime = Math.floor(new Date(apiMatch.utcDate).getTime() / 1000);
              
              await contractIntegration.createMatch(
                apiMatch.homeTeam.name,
                apiMatch.awayTeam.name,
                startTime,
                homeOdds,
                drawOdds,
                awayOdds
              );
              
              // Add to processed matches
              processedMatches.push({
                id: contractMatches.length + processedMatches.length + 1,
                homeTeam: apiMatch.homeTeam.name,
                awayTeam: apiMatch.awayTeam.name,
                startTime,
                status: 0, // UPCOMING
                homeOdds,
                drawOdds,
                awayOdds,
                totalPool: BigInt(0),
                apiMatchId: apiMatch.id,
                confidence: prediction.confidence,
                analysis: prediction.analysis,
              });
            } catch (error) {
              console.error(`Error processing match ${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}:`, error);
            }
          }
        }
        
        // Sort matches by start time
        processedMatches.sort((a, b) => a.startTime - b.startTime);
        
        setMatches(processedMatches);
      } catch (error) {
        console.error('Error loading matches:', error);
        setError(error instanceof Error ? error.message : 'Failed to load matches');
        
        // Fallback: show contract matches only
        try {
          const contractMatches = await contractIntegration.getAllMatches();
          setMatches(contractMatches.map(cm => ({
            id: cm.id,
            homeTeam: cm.homeTeam,
            awayTeam: cm.awayTeam,
            startTime: cm.startTime,
            status: cm.status,
            homeOdds: cm.homeOdds,
            drawOdds: cm.drawOdds,
            awayOdds: cm.awayOdds,
            totalPool: cm.totalPool,
          })));
        } catch (contractError) {
          console.error('Error loading contract matches:', contractError);
        }
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
            <span>Premier League Matches</span>
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-4 w-4" />
            <span>AI-Calculated Odds</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading matches
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {matches.length === 0 && !loading ? (
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



