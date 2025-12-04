// Real Football API Integration
const FOOTBALL_API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_API_KEY || 'your-api-key';
const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

export interface FootballMatch {
  id: number;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  utcDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  matchday: number;
  stage: string;
  group: string | null;
  lastUpdated: string;
  odds?: {
    msg: string;
  };
  score: {
    winner: string | null;
    duration: string;
    fullTime: {
      home: number | null;
      away: number | null;
    };
    halfTime: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface Competition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
}

export class FootballAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = FOOTBALL_API_KEY;
    this.baseUrl = FOOTBALL_API_BASE;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Auth-Token': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Football API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get Premier League matches
  async getPremierLeagueMatches(): Promise<FootballMatch[]> {
    try {
      const data = await this.makeRequest('/competitions/PL/matches?status=SCHEDULED');
      return data.matches || [];
    } catch (error) {
      console.error('Error fetching Premier League matches:', error);
      throw error;
    }
  }

  // Get specific match details
  async getMatchDetails(matchId: number): Promise<FootballMatch> {
    try {
      const data = await this.makeRequest(`/matches/${matchId}`);
      return data;
    } catch (error) {
      console.error('Error fetching match details:', error);
      throw error;
    }
  }

  // Get team information
  async getTeamInfo(teamId: number) {
    try {
      const data = await this.makeRequest(`/teams/${teamId}`);
      return data;
    } catch (error) {
      console.error('Error fetching team info:', error);
      throw error;
    }
  }

  // Get live matches
  async getLiveMatches(): Promise<FootballMatch[]> {
    try {
      const data = await this.makeRequest('/competitions/PL/matches?status=LIVE,IN_PLAY');
      return data.matches || [];
    } catch (error) {
      console.error('Error fetching live matches:', error);
      throw error;
    }
  }

  // Get finished matches for result verification
  async getFinishedMatches(): Promise<FootballMatch[]> {
    try {
      const data = await this.makeRequest('/competitions/PL/matches?status=FINISHED');
      return data.matches || [];
    } catch (error) {
      console.error('Error fetching finished matches:', error);
      throw error;
    }
  }
}

export const footballAPI = new FootballAPI();
