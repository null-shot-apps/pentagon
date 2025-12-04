// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FootballPredictionMarket
 * @dev A decentralized prediction market for English Premier League football matches
 * Users can bet on match outcomes using POL tokens with AI-calculated odds
 */
contract FootballPredictionMarket is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable polToken;
    
    // Match outcomes
    enum MatchOutcome { HOME_WIN, DRAW, AWAY_WIN }
    
    // Match status
    enum MatchStatus { UPCOMING, LIVE, FINISHED, CANCELLED }
    
    struct Match {
        uint256 matchId;
        string homeTeam;
        string awayTeam;
        uint256 startTime;
        MatchStatus status;
        MatchOutcome result;
        bool resultSet;
        uint256 totalPool;
        mapping(MatchOutcome => uint256) outcomePool;
        mapping(MatchOutcome => uint256) outcomeOdds; // Multiplied by 1000 for precision
    }
    
    struct Bet {
        uint256 matchId;
        address bettor;
        MatchOutcome prediction;
        uint256 amount;
        uint256 odds; // Odds at time of bet (multiplied by 1000)
        bool claimed;
    }
    
    // State variables
    uint256 public nextMatchId = 1;
    uint256 public nextBetId = 1;
    uint256 public constant HOUSE_FEE = 50; // 5% (50/1000)
    uint256 public constant ODDS_PRECISION = 1000;
    uint256 public constant MIN_BET_AMOUNT = 1e18; // 1 POL minimum
    
    mapping(uint256 => Match) public matches;
    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public userBets;
    mapping(uint256 => uint256[]) public matchBets;
    
    // Events
    event MatchCreated(
        uint256 indexed matchId,
        string homeTeam,
        string awayTeam,
        uint256 startTime
    );
    
    event OddsUpdated(
        uint256 indexed matchId,
        uint256 homeOdds,
        uint256 drawOdds,
        uint256 awayOdds
    );
    
    event BetPlaced(
        uint256 indexed betId,
        uint256 indexed matchId,
        address indexed bettor,
        MatchOutcome prediction,
        uint256 amount,
        uint256 odds
    );
    
    event MatchResultSet(
        uint256 indexed matchId,
        MatchOutcome result
    );
    
    event WinningsClaimed(
        uint256 indexed betId,
        address indexed bettor,
        uint256 amount
    );
    
    event MatchStatusUpdated(
        uint256 indexed matchId,
        MatchStatus status
    );
    
    constructor(address _polToken) Ownable(msg.sender) {
        polToken = IERC20(_polToken);
    }
    
    /**
     * @dev Create a new match for betting
     * @param homeTeam Name of the home team
     * @param awayTeam Name of the away team
     * @param startTime Unix timestamp of match start
     * @param homeOdds Initial odds for home win (multiplied by 1000)
     * @param drawOdds Initial odds for draw (multiplied by 1000)
     * @param awayOdds Initial odds for away win (multiplied by 1000)
     */
    function createMatch(
        string memory homeTeam,
        string memory awayTeam,
        uint256 startTime,
        uint256 homeOdds,
        uint256 drawOdds,
        uint256 awayOdds
    ) external onlyOwner {
        require(startTime > block.timestamp, "Match must be in the future");
        require(homeOdds > 0 && drawOdds > 0 && awayOdds > 0, "Invalid odds");
        
        uint256 matchId = nextMatchId++;
        Match storage newMatch = matches[matchId];
        
        newMatch.matchId = matchId;
        newMatch.homeTeam = homeTeam;
        newMatch.awayTeam = awayTeam;
        newMatch.startTime = startTime;
        newMatch.status = MatchStatus.UPCOMING;
        newMatch.resultSet = false;
        newMatch.totalPool = 0;
        
        newMatch.outcomeOdds[MatchOutcome.HOME_WIN] = homeOdds;
        newMatch.outcomeOdds[MatchOutcome.DRAW] = drawOdds;
        newMatch.outcomeOdds[MatchOutcome.AWAY_WIN] = awayOdds;
        
        emit MatchCreated(matchId, homeTeam, awayTeam, startTime);
        emit OddsUpdated(matchId, homeOdds, drawOdds, awayOdds);
    }
    
    /**
     * @dev Update odds for a match (AI-calculated)
     * @param matchId The match ID
     * @param homeOdds New odds for home win
     * @param drawOdds New odds for draw
     * @param awayOdds New odds for away win
     */
    function updateOdds(
        uint256 matchId,
        uint256 homeOdds,
        uint256 drawOdds,
        uint256 awayOdds
    ) external onlyOwner {
        require(matches[matchId].matchId != 0, "Match does not exist");
        require(matches[matchId].status == MatchStatus.UPCOMING, "Cannot update odds for started match");
        require(homeOdds > 0 && drawOdds > 0 && awayOdds > 0, "Invalid odds");
        
        matches[matchId].outcomeOdds[MatchOutcome.HOME_WIN] = homeOdds;
        matches[matchId].outcomeOdds[MatchOutcome.DRAW] = drawOdds;
        matches[matchId].outcomeOdds[MatchOutcome.AWAY_WIN] = awayOdds;
        
        emit OddsUpdated(matchId, homeOdds, drawOdds, awayOdds);
    }
    
    /**
     * @dev Place a bet on a match outcome
     * @param matchId The match ID
     * @param prediction The predicted outcome
     * @param amount Amount of POL tokens to bet
     */
    function placeBet(
        uint256 matchId,
        MatchOutcome prediction,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(matches[matchId].matchId != 0, "Match does not exist");
        require(matches[matchId].status == MatchStatus.UPCOMING, "Betting closed");
        require(block.timestamp < matches[matchId].startTime, "Match has started");
        require(amount >= MIN_BET_AMOUNT, "Bet amount too low");
        
        // Transfer POL tokens to contract
        require(
            polToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        uint256 betId = nextBetId++;
        uint256 currentOdds = matches[matchId].outcomeOdds[prediction];
        
        // Create bet record
        bets[betId] = Bet({
            matchId: matchId,
            bettor: msg.sender,
            prediction: prediction,
            amount: amount,
            odds: currentOdds,
            claimed: false
        });
        
        // Update match pools
        matches[matchId].totalPool += amount;
        matches[matchId].outcomePool[prediction] += amount;
        
        // Update user and match bet arrays
        userBets[msg.sender].push(betId);
        matchBets[matchId].push(betId);
        
        emit BetPlaced(betId, matchId, msg.sender, prediction, amount, currentOdds);
    }
    
    /**
     * @dev Set the result of a match
     * @param matchId The match ID
     * @param result The actual match outcome
     */
    function setMatchResult(
        uint256 matchId,
        MatchOutcome result
    ) external onlyOwner {
        require(matches[matchId].matchId != 0, "Match does not exist");
        require(!matches[matchId].resultSet, "Result already set");
        require(
            matches[matchId].status == MatchStatus.LIVE || 
            matches[matchId].status == MatchStatus.FINISHED,
            "Match not ready for result"
        );
        
        matches[matchId].result = result;
        matches[matchId].resultSet = true;
        matches[matchId].status = MatchStatus.FINISHED;
        
        emit MatchResultSet(matchId, result);
    }
    
    /**
     * @dev Claim winnings from a successful bet
     * @param betId The bet ID
     */
    function claimWinnings(uint256 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");
        
        Match storage matchData = matches[bet.matchId];
        require(matchData.resultSet, "Match result not set");
        require(bet.prediction == matchData.result, "Losing bet");
        
        bet.claimed = true;
        
        // Calculate winnings: (bet amount * odds / 1000) - house fee
        uint256 grossWinnings = (bet.amount * bet.odds) / ODDS_PRECISION;
        uint256 houseFee = (grossWinnings * HOUSE_FEE) / ODDS_PRECISION;
        uint256 netWinnings = grossWinnings - houseFee;
        
        require(polToken.transfer(msg.sender, netWinnings), "Transfer failed");
        
        emit WinningsClaimed(betId, msg.sender, netWinnings);
    }
    
    /**
     * @dev Update match status
     * @param matchId The match ID
     * @param status New status
     */
    function updateMatchStatus(
        uint256 matchId,
        MatchStatus status
    ) external onlyOwner {
        require(matches[matchId].matchId != 0, "Match does not exist");
        matches[matchId].status = status;
        emit MatchStatusUpdated(matchId, status);
    }
    
    /**
     * @dev Get match details
     * @param matchId The match ID
     */
    function getMatch(uint256 matchId) external view returns (
        string memory homeTeam,
        string memory awayTeam,
        uint256 startTime,
        MatchStatus status,
        MatchOutcome result,
        bool resultSet,
        uint256 totalPool,
        uint256 homeOdds,
        uint256 drawOdds,
        uint256 awayOdds
    ) {
        Match storage matchData = matches[matchId];
        return (
            matchData.homeTeam,
            matchData.awayTeam,
            matchData.startTime,
            matchData.status,
            matchData.result,
            matchData.resultSet,
            matchData.totalPool,
            matchData.outcomeOdds[MatchOutcome.HOME_WIN],
            matchData.outcomeOdds[MatchOutcome.DRAW],
            matchData.outcomeOdds[MatchOutcome.AWAY_WIN]
        );
    }
    
    /**
     * @dev Get user's bets
     * @param user User address
     */
    function getUserBets(address user) external view returns (uint256[] memory) {
        return userBets[user];
    }
    
    /**
     * @dev Get bets for a specific match
     * @param matchId The match ID
     */
    function getMatchBets(uint256 matchId) external view returns (uint256[] memory) {
        return matchBets[matchId];
    }
    
    /**
     * @dev Calculate potential winnings for a bet
     * @param amount Bet amount
     * @param odds Current odds
     */
    function calculateWinnings(uint256 amount, uint256 odds) external pure returns (uint256) {
        uint256 grossWinnings = (amount * odds) / ODDS_PRECISION;
        uint256 houseFee = (grossWinnings * HOUSE_FEE) / ODDS_PRECISION;
        return grossWinnings - houseFee;
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = polToken.balanceOf(address(this));
        require(polToken.transfer(owner(), balance), "Transfer failed");
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}




