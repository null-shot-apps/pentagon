'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS } from '../lib/wagmi';
import { PREDICTION_MARKET_ABI, POL_TOKEN_ABI } from '../lib/abis';
import { X, Calculator, AlertCircle } from 'lucide-react';

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
  const [, setStep] = useState<'input' | 'approve' | 'bet' | 'success'>('input');

  const { data: balance } = useReadContract({
    address: CONTRACTS.POL_TOKEN,
    abi: POL_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: allowance } = useReadContract({
    address: CONTRACTS.POL_TOKEN,
    abi: POL_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.PREDICTION_MARKET] : undefined,
  }) as { data: bigint | undefined };

  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: placeBet, data: betHash } = useWriteContract();
  const { writeContract: faucet } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isBetting } = useWaitForTransactionReceipt({
    hash: betHash,
  });

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
    if (!betAmount) return;
    try {
      const amount = parseEther(betAmount);
      approve({
        address: CONTRACTS.POL_TOKEN,
        abi: POL_TOKEN_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PREDICTION_MARKET, amount],
      });
      setStep('approve');
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handlePlaceBet = async () => {
    if (!betAmount) return;
    try {
      const amount = parseEther(betAmount);
      placeBet({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(match.id), outcome, amount],
      });
      setStep('bet');
    } catch (error) {
      console.error('Bet placement failed:', error);
    }
  };

  const handleFaucet = async () => {
    try {
      faucet({
        address: CONTRACTS.POL_TOKEN,
        abi: POL_TOKEN_ABI,
        functionName: 'faucet',
        args: [parseEther('100')], // 100 POL
      });
    } catch (error) {
      console.error('Faucet failed:', error);
    }
  };

  const hasInsufficientBalance = () => {
    if (!betAmount || !balance) return false;
    try {
      const amount = parseEther(betAmount);
      return BigInt(balance.toString()) < BigInt(amount.toString());
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

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          
          {needsApproval() ? (
            <button
              onClick={handleApprove}
              disabled={!betAmount || hasInsufficientBalance() || isApproving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isApproving ? 'Approving...' : 'Approve POL'}
            </button>
          ) : (
            <button
              onClick={handlePlaceBet}
              disabled={!betAmount || hasInsufficientBalance() || isBetting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBetting ? 'Placing Bet...' : 'Place Bet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}




