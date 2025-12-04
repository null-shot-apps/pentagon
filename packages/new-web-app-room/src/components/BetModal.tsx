'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { contractIntegration } from '../lib/contract-integration';
import { X, Calculator, AlertCircle, CheckCircle } from 'lucide-react';

interface BetModalProps {
  match: {
    id: number;
    homeTeam: string;
    awayTeam: string;
  };
  outcome: number;
  outcomeName: string;
  odds: number;
  onClose: () => void;
}

export function BetModal({ match, outcome, outcomeName, odds, onClose }: BetModalProps) {
  const { address } = useAccount();
  const [betAmount, setBetAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'bet' | 'success'>('input');
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Load user balance and allowance
  useEffect(() => {
    const loadUserData = async () => {
      if (!address) return;
      
      try {
        const [userBalance, userAllowance] = await Promise.all([
          contractIntegration.getUserBalance(address),
          contractIntegration.getAllowance(address),
        ]);
        
        setBalance(userBalance);
        setAllowance(userAllowance);
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load wallet data');
      }
    };

    loadUserData();
  }, [address]);

  const formatOdds = (odds: number) => {
    return (odds / 1000).toFixed(2);
  };

  const calculatePotentialWinnings = () => {
    if (!betAmount) return '0';
    try {
      const amount = parseFloat(betAmount);
      const multiplier = odds / 1000;
      const grossWinnings = amount * multiplier;
      const houseFee = grossWinnings * 0.05; // 5% house fee
      const netWinnings = grossWinnings - houseFee;
      return netWinnings.toFixed(4);
    } catch {
      return '0';
    }
  };

  const needsApproval = () => {
    if (!betAmount || !allowance) return true;
    try {
      const amount = parseEther(betAmount);
      return allowance < amount;
    } catch {
      return true;
    }
  };

  const handleApprove = async () => {
    if (!betAmount || !address) return;
    
    try {
      setLoading(true);
      setError(null);
      setStep('approve');
      
      const amount = parseEther(betAmount);
      const hash = await contractIntegration.approvePOL(amount);
      
      setTxHash(hash);
      
      // Refresh allowance
      const newAllowance = await contractIntegration.getAllowance(address);
      setAllowance(newAllowance);
      
      setStep('input');
    } catch (error) {
      console.error('Approval failed:', error);
      setError(error instanceof Error ? error.message : 'Approval failed');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!betAmount || !address) return;
    
    try {
      setLoading(true);
      setError(null);
      setStep('bet');
      
      const amount = parseEther(betAmount);
      const hash = await contractIntegration.placeBet(match.id, outcome, amount);
      
      setTxHash(hash);
      setStep('success');
      
      // Refresh user data
      const [newBalance, newAllowance] = await Promise.all([
        contractIntegration.getUserBalance(address),
        contractIntegration.getAllowance(address),
      ]);
      
      setBalance(newBalance);
      setAllowance(newAllowance);
      
    } catch (error) {
      console.error('Bet placement failed:', error);
      setError(error instanceof Error ? error.message : 'Bet placement failed');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleFaucet = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // For demo purposes - in production, this would be a separate faucet contract
      // For now, we'll show a message that this is a demo feature
      setError('Faucet feature is for demo only. In production, you would purchase POL tokens.');
      
    } catch (error) {
      console.error('Faucet failed:', error);
      setError(error instanceof Error ? error.message : 'Faucet failed');
    } finally {
      setLoading(false);
    }
  };

  const hasInsufficientBalance = () => {
    if (!betAmount || !balance) return false;
    try {
      const amount = parseEther(betAmount);
      return balance < amount;
    } catch {
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Place Bet
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="text-center">
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                {match.homeTeam} vs {match.awayTeam}
              </h4>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Betting on: <span className="font-medium text-blue-600 dark:text-blue-400">{outcomeName}</span>
              </div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatOdds(odds)}x odds
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bet Amount (POL)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {balance && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Balance: {formatEther(balance)} POL
                </div>
              )}
            </div>

            {betAmount && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Potential Winnings
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {calculatePotentialWinnings()} POL
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  (After 5% house fee)
                </div>
              </div>
            )}

            {hasInsufficientBalance() && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-200">
                    Insufficient balance
                  </span>
                </div>
                <button
                  onClick={handleFaucet}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Get test POL tokens from faucet
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">
                {error}
              </span>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-200">
                Bet placed successfully!
              </span>
            </div>
            {txHash && (
              <div className="mt-2 text-xs text-green-700 dark:text-green-300">
                Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {step === 'success' ? 'Close' : 'Cancel'}
          </button>
          
          {step !== 'success' && (
            needsApproval() ? (
              <button
                onClick={handleApprove}
                disabled={!betAmount || hasInsufficientBalance() || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && step === 'approve' ? 'Approving...' : 'Approve POL'}
              </button>
            ) : (
              <button
                onClick={handlePlaceBet}
                disabled={!betAmount || hasInsufficientBalance() || loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && step === 'bet' ? 'Placing Bet...' : 'Place Bet'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}









