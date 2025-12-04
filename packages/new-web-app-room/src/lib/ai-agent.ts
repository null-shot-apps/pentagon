// AI Agent for Odds Calculation and Market Analysis
import { FootballMatch } from './football-api';

export interface TeamStats {
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string[]; // Last 5 matches: 'W', 'L', 'D'
  homeAdvantage: number;
  awayPerformance: number;
}

export interface MatchPrediction {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  confidence: number;
  analysis: string;
  keyFactors: string[];
}

export class AIAgent {
  private readonly HOUSE_EDGE = 0.05; // 5% house edge
  private readonly MIN_ODDS = 1.1;
  private readonly MAX_ODDS = 50.0;

  // Calculate odds based on team statistics and historical data
  async calculateOdds(match: FootballMatch, homeStats: TeamStats, awayStats: TeamStats): Promise<MatchPrediction> {
    try {
      // Base probability calculation using ELO-like rating system
      const homeStrength = this.calculateTeamStrength(homeStats, true);
      const awayStrength = this.calculateTeamStrength(awayStats, false);
      
      // Adjust for recent form
      const homeFormFactor = this.calculateFormFactor(homeStats.form);
      const awayFormFactor = this.calculateFormFactor(awayStats.form);
      
      // Head-to-head historical factor (simplified)
      const h2hFactor = this.getHeadToHeadFactor(match.homeTeam.name, match.awayTeam.name);
      
      // Calculate raw probabilities
      let homeProbability = this.calculateWinProbability(homeStrength * homeFormFactor, awayStrength * awayFormFactor * h2hFactor);
      let awayProbability = this.calculateWinProbability(awayStrength * awayFormFactor, homeStrength * homeFormFactor);
      let drawProbability = 1 - homeProbability - awayProbability;
      
      // Normalize probabilities to ensure they sum to 1
      const total = homeProbability + drawProbability + awayProbability;
      homeProbability /= total;
      drawProbability /= total;
      awayProbability /= total;
      
      // Convert probabilities to odds with house edge
      const homeOdds = this.probabilityToOdds(homeProbability);
      const drawOdds = this.probabilityToOdds(drawProbability);
      const awayOdds = this.probabilityToOdds(awayProbability);
      
      // Generate analysis
      const analysis = this.generateAnalysis(match, homeStats, awayStats, homeProbability, awayProbability);
      const keyFactors = this.identifyKeyFactors(homeStats, awayStats, homeFormFactor, awayFormFactor);
      
      // Calculate confidence based on data quality and variance
      const confidence = this.calculateConfidence(homeStats, awayStats, homeProbability, awayProbability);
      
      return {
        homeWinProbability: homeProbability,
        drawProbability: drawProbability,
        awayWinProbability: awayProbability,
        homeOdds,
        drawOdds,
        awayOdds,
        confidence,
        analysis,
        keyFactors
      };
    } catch (error) {
      console.error('Error calculating odds:', error);
      throw error;
    }
  }

  private calculateTeamStrength(stats: TeamStats, isHome: boolean): number {
    const winRate = stats.wins / (stats.wins + stats.losses + stats.draws);
    const goalDifference = (stats.goalsFor - stats.goalsAgainst) / (stats.wins + stats.losses + stats.draws);
    const homeAwayFactor = isHome ? stats.homeAdvantage : stats.awayPerformance;
    
    return (winRate * 0.4 + (goalDifference + 2) / 4 * 0.3 + homeAwayFactor * 0.3);
  }

  private calculateFormFactor(form: string[]): number {
    if (form.length === 0) return 1.0;
    
    let formScore = 0;
    const weights = [0.4, 0.3, 0.2, 0.1]; // Recent matches weighted more heavily
    
    for (let i = 0; i < Math.min(form.length, 4); i++) {
      const result = form[i];
      const weight = weights[i] || 0.05;
      
      if (result === 'W') formScore += 3 * weight;
      else if (result === 'D') formScore += 1 * weight;
      // Loss adds 0
    }
    
    return 0.7 + (formScore / 3) * 0.6; // Scale between 0.7 and 1.3
  }

  private getHeadToHeadFactor(homeTeam: string, awayTeam: string): number {
    // Simplified H2H factor - in real implementation, this would query historical data
    const rivalries: { [key: string]: number } = {
      'Manchester United-Liverpool': 0.95,
      'Liverpool-Manchester United': 1.05,
      'Arsenal-Tottenham': 1.1,
      'Tottenham-Arsenal': 0.9,
      'Manchester City-Manchester United': 1.05,
      'Manchester United-Manchester City': 0.95,
    };
    
    const key = `${homeTeam}-${awayTeam}`;
    return rivalries[key] || 1.0;
  }

  private calculateWinProbability(teamStrength: number, opponentStrength: number): number {
    // Using logistic function for probability calculation
    const strengthDiff = teamStrength - opponentStrength;
    return 1 / (1 + Math.exp(-strengthDiff * 3));
  }

  private probabilityToOdds(probability: number): number {
    if (probability <= 0) return this.MAX_ODDS;
    
    // Add house edge
    const adjustedProbability = probability * (1 - this.HOUSE_EDGE);
    const odds = 1 / adjustedProbability;
    
    // Clamp odds to reasonable range
    return Math.max(this.MIN_ODDS, Math.min(this.MAX_ODDS, odds));
  }

  private generateAnalysis(
    match: FootballMatch, 
    homeStats: TeamStats, 
    awayStats: TeamStats, 
    homeProbability: number, 
    awayProbability: number
  ): string {
    const favorite = homeProbability > awayProbability ? match.homeTeam.name : match.awayTeam.name;
    const favoriteProb = Math.max(homeProbability, awayProbability);
    
    let analysis = `${favorite} are favored with a ${(favoriteProb * 100).toFixed(1)}% win probability. `;
    
    if (homeStats.form.slice(0, 3).filter(r => r === 'W').length >= 2) {
      analysis += `${match.homeTeam.name} are in good form at home. `;
    }
    
    if (awayStats.form.slice(0, 3).filter(r => r === 'W').length >= 2) {
      analysis += `${match.awayTeam.name} have been strong away from home. `;
    }
    
    const goalDiffHome = homeStats.goalsFor - homeStats.goalsAgainst;
    const goalDiffAway = awayStats.goalsFor - awayStats.goalsAgainst;
    
    if (Math.abs(goalDiffHome - goalDiffAway) > 10) {
      analysis += `Significant goal difference advantage suggests a potentially one-sided match. `;
    }
    
    return analysis.trim();
  }

  private identifyKeyFactors(
    homeStats: TeamStats, 
    awayStats: TeamStats, 
    homeForm: number, 
    awayForm: number
  ): string[] {
    const factors: string[] = [];
    
    if (homeForm > 1.2) factors.push('Home team excellent recent form');
    if (awayForm > 1.2) factors.push('Away team excellent recent form');
    if (homeForm < 0.8) factors.push('Home team poor recent form');
    if (awayForm < 0.8) factors.push('Away team poor recent form');
    
    if (homeStats.homeAdvantage > 0.7) factors.push('Strong home advantage');
    if (awayStats.awayPerformance > 0.7) factors.push('Strong away record');
    
    const homeGoalDiff = homeStats.goalsFor - homeStats.goalsAgainst;
    const awayGoalDiff = awayStats.goalsFor - awayStats.goalsAgainst;
    
    if (homeGoalDiff > 15) factors.push('Home team superior attack/defense');
    if (awayGoalDiff > 15) factors.push('Away team superior attack/defense');
    
    return factors;
  }

  private calculateConfidence(
    homeStats: TeamStats, 
    awayStats: TeamStats, 
    homeProbability: number, 
    awayProbability: number
  ): number {
    // Higher confidence when:
    // 1. More games played (more data)
    // 2. Clear favorite (less uncertainty)
    // 3. Consistent form
    
    const totalGames = homeStats.wins + homeStats.losses + homeStats.draws;
    const dataQuality = Math.min(totalGames / 20, 1); // Normalize to 20 games
    
    const probabilitySpread = Math.abs(homeProbability - awayProbability);
    const certainty = probabilitySpread; // Higher spread = more certain
    
    const formConsistency = this.calculateFormConsistency(homeStats.form) * 
                           this.calculateFormConsistency(awayStats.form);
    
    return (dataQuality * 0.4 + certainty * 0.4 + formConsistency * 0.2);
  }

  private calculateFormConsistency(form: string[]): number {
    if (form.length < 3) return 0.5;
    
    const wins = form.filter(r => r === 'W').length;
    const draws = form.filter(r => r === 'D').length;
    const losses = form.filter(r => r === 'L').length;
    
    // Higher consistency when results are similar
    const total = form.length;
    const variance = Math.pow(wins/total - 0.33, 2) + 
                    Math.pow(draws/total - 0.33, 2) + 
                    Math.pow(losses/total - 0.33, 2);
    
    return Math.max(0, 1 - variance * 3);
  }

  // Get mock team statistics (in real implementation, this would fetch from database)
  async getTeamStats(teamName: string): Promise<TeamStats> {
    // This is a simplified mock - in production, you'd fetch real historical data
    const mockStats: { [key: string]: TeamStats } = {
      'Manchester United': {
        wins: 12, losses: 4, draws: 6,
        goalsFor: 35, goalsAgainst: 22,
        form: ['W', 'W', 'D', 'L', 'W'],
        homeAdvantage: 0.75,
        awayPerformance: 0.65
      },
      'Liverpool': {
        wins: 15, losses: 3, draws: 4,
        goalsFor: 42, goalsAgainst: 18,
        form: ['W', 'W', 'W', 'D', 'W'],
        homeAdvantage: 0.85,
        awayPerformance: 0.78
      },
      'Manchester City': {
        wins: 18, losses: 2, draws: 2,
        goalsFor: 48, goalsAgainst: 15,
        form: ['W', 'W', 'W', 'W', 'L'],
        homeAdvantage: 0.88,
        awayPerformance: 0.82
      },
      'Arsenal': {
        wins: 14, losses: 3, draws: 5,
        goalsFor: 38, goalsAgainst: 20,
        form: ['W', 'D', 'W', 'W', 'L'],
        homeAdvantage: 0.80,
        awayPerformance: 0.70
      },
      'Chelsea': {
        wins: 10, losses: 6, draws: 6,
        goalsFor: 28, goalsAgainst: 25,
        form: ['L', 'D', 'W', 'L', 'D'],
        homeAdvantage: 0.68,
        awayPerformance: 0.58
      }
    };

    return mockStats[teamName] || {
      wins: 8, losses: 8, draws: 6,
      goalsFor: 25, goalsAgainst: 25,
      form: ['D', 'L', 'W', 'D', 'L'],
      homeAdvantage: 0.60,
      awayPerformance: 0.55
    };
  }
}

export const aiAgent = new AIAgent();

