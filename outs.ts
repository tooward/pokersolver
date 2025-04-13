// Import the Hand class from your handsolver file as HandSolver.
import { Card, Hand, Game } from './pokersolver';
import { values } from './constants';

export enum PokerError {
  PreflopNotAllowed = "PRE_FLOP_NOT_ALLOWED",
  InsufficientCommunityCards = "INSUFFICIENT_COMMUNITY_CARDS",
  InvalidHoleCards = "INVALID_HOLE_CARDS"
}

export class Out {
    possibleHand: boolean = false;
    outHand: string = "";
    cardNeededCount: number = 0;
    cardsThatCanMakeHand: Card[] = [];
    cardsHeldForOut: Card[] = [];
}

export class Outs {
  outs: Out[] = [];
  highestOutHand: string = "";
  outCards: Card[] = [];
  fourAndTwoPercent: number = 0;
  communityCards: Card[] = [];
  holeCards: Card[] = [];
  handStage: string = "";
  boardTexture: BoardTexture = {
    highCard: false, 
    paired: false,  // true if there is a pair on the board
    monotone: false,  // true if all cards are of the same suit
    twoTone: false,  // true if there are two suits on the board
    connectivity: 0,  // 0 = disconnected → 4 = highly connected
    straightDraw: 'none',  // 'none', 'gutshot', or 'open'
    flushDraw: false,
    dry: false,  // true if the board is dry
    wet: false   // true if the board is wet
  };
}

/**
* # Board Texture
* 
* **Paired** 
* Two or more cards of the same rank on the board.
* Implications:
	•	Increases the chance of full houses or trips.
	•	Can slow down action if players are cautious of someone holding trips.
	•	Good bluffing opportunities if you’re representing the trips.
  
**Monotone**
All cards on the board are of the same suit.
Implications:
	•	Immediate concern about a flush.
	•	Players with just one suited card might have a flush draw.
	•	Very polarizing — someone either has the flush or is drawing/bluffing.

**Two Tone**
Two suits are present on the board.
Implications:
	•	Immediate concern about a flush.
	•	Players with just one suited card might have a flush draw.
	•	Very polarizing — someone either has the flush or is drawing/bluffing.

**Connectivity**
The degree of connection between the cards on the board.
Implications:
	•	Good for straight draws, combo draws.
	•	Very relevant in hands involving suited connectors or low pairs.
	•	Can change significantly by the turn/river.


**Straight Draw**
The type of straight draw present on the board.
Implications:
	•	Increases semi-bluffing range.
	•	Turn/river may complete or miss draws, affecting betting patterns.
  
**Flush Draw**
The presence of a flush draw on the board.
Implications:
	•	Players with suited hands may continue aggressively.
	•	If the turn or river adds the third suit card, flushes become possible.
*/
export interface BoardTexture {
  highCard: boolean
  paired: boolean
  monotone: boolean
  twoTone: boolean
  connectivity: number    // 0 = disconnected → 4 = highly connected
  straightDraw: 'none'|'gutshot'|'open'
  flushDraw: boolean
  dry: boolean
  wet: boolean
}

export const BoardTextureDescriptions: { [K in keyof BoardTexture]: string } = {
  paired: "True if there is at least one pair among the board cards.",
  highCard: "True if the board is unpaired, disconnected or only slightly connected, has no immediate flush, and includes at least one broadway card (A, K, Q, J, T).",
  monotone: "True if all board cards are of the same suit.",
  twoTone: "True if two cards of one suit are present among the board cards.",
  connectivity: "Numeric measure (0 to 4) showing how closely the board cards are connected in rank.",
  straightDraw: "Type of straight draw present: 'none', 'gutshot', or 'open'.",
  flushDraw: "True if two cards of the same suit exists with the board cards setting up a player for a potential flush draw.",
  dry: "True if the board is considered dry (little potential for straight or flush draws).",
  wet: "True if the board is considered wet (lots of draw possibilities). Note that while not monotone 3 or more cards of same suit can help make a board wet."
};

export enum HandRankings {
  highCard = "High Card",
  pair = "Pair",
  twopair = "Two Pair",
  threeofakind = "Three of a Kind",
  straight = "Straight",
  flush = "Flush",
  fullhouse = "Full House",
  fourofkind = "Four of a Kind",
  straightflush = "Straight Flush"
}

export enum HandStrengthRanked {
  HighCard = 1,
  OnePair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush
}

export default class HandEvaluator {

  /**
   * Calculates the NEXT available outs for the best hand using the solved hand from the solver.
   * ex: if the hand is just a high card hand it returns outs for the next best hand (pair)
   * Uses the functions in this file to evaluate outs.
   * @param hand - The solved hand (of type Hand) which must have at least 5 cards.
   * @returns Outs container containing the list of Out objects and a unique list of cards that complete an improvement.
   */

      /*
      This is a naive implementation that checks for the best hand and then calculates the outs for the next best hand. It should be refactored per the below logic.

      When calculating outs in Texas Hold’em, you’re specifically counting the cards that would directly improve your hand to beat your opponent’s likely holding. You don’t count outs for every theoretically possible better hand, nor do you restrict yourself only to the immediate next-best rank. Instead, you focus on:
      1.	Realistic winning improvements:
      •	Consider only cards that directly turn your hand into a winner, given your read on your opponent’s likely strength or range.
      2.	Hands that significantly increase strength:
      •	For example, if you currently have a flush draw, your outs are simply the cards of that suit remaining in the deck.
      •	If you’re on a straight draw, your outs are the exact ranks that complete your straight.
      3.	Do not count incremental, meaningless improvements:
      •	For instance, if you currently have a pair, don’t count cards that merely improve your kicker slightly unless you specifically believe that improvement would realistically put you ahead.

      Example:
      •	If you have 9♣ 8♣ and the board shows 7♦ 10♣ 2♣, your immediate outs are:
      •	Any J or 6 (to complete your straight), plus
      •	Any remaining ♣ (to complete your flush).

      */

      /*
      * Helper function to build a properly formatted combined set of Card[]
      * Card constructor expects values in specific order
      */
      static combineHoleAndCommunity(holeCards: Card[], communityCards: Card[]): Card[] {
        const allCards = [
          ...holeCards.map(c => new Card(c.value + c.suit)),
          ...communityCards.map(c => new Card(c.value + c.suit))
        ];
        return allCards;
      }

    //TODO - Need to adjust calculateOuts()
      // - Starting point is the best hand that can be made with community only cards, not just the players hand
      // - 	1.	Clean outs → improve your hand without likely giving opponents a better one
      // -  2.	Dirty outs → improve you but also create a stronger hand for someone else (or tie)
      // 1.	List every card that completes your best hand.
      // 2.	Subtract any card that would ALSO give a better hand to an opponent.
      // 3.	Subtract any card that makes the board a strong hand on its own (full house, straight, flush)

    /**
     * This function calculates all possible outs from a given poker hand.
     * It analyzes the current hand and returns all possible improvements.
     */
    static calculateOuts(holeCards: Card[], communityCards: Card[]): Outs {
      const result = new Outs();
      result.holeCards = [...holeCards];
      result.communityCards = [...communityCards];
      
      // Set the hand stage
      if (communityCards.length === 3) {
        result.handStage = "Flop";
      } else if (communityCards.length === 4) {
        result.handStage = "Turn";
      } else if (communityCards.length === 5) {
        result.handStage = "River";
      } else if (communityCards.length < 3) {
        result.handStage = "Pre-Flop";
        return result; // No outs calculation pre-flop
      }
      
      // Calculate the board texture
      try {
        result.boardTexture = this.evaluateBoard(communityCards);
      } catch (e) {
        console.warn("Unable to evaluate board texture:", e);
      }
      
      // Create the hand evaluator

            // create a Hand object from the hole and community cards
      const allCards = HandEvaluator.combineHoleAndCommunity(holeCards, communityCards);
      const game = new Game("standard");
//            const hand = Hand.solve(allCards, game);
      const hand = Hand.solve(allCards.map(c => c.toString()), game);
      const handRank = hand.rank;
      const handName = hand.name;
      
      // Process based on current hand
      switch (handName) {
        case "Royal Flush":
        case "Straight Flush":
          // No improvement possible
          break;
        
        case "Four of a Kind":
          // No improvement possible
          break;
        
        case "Full House":
          // Improvement to a better full house or four of a kind
          this.addOutsToResult(result, this.outsToFourKind(holeCards, communityCards));
          break;
        
        case "Flush":
          // Improvement to a better flush (not checked), full house, or straight flush (checked for all hands at bottom if straight draw)
          this.addOutsToResult(result, this.outsToFullHouse(holeCards, communityCards));
          break;
        
        case "Straight":
          // Improvement to a better straight, flush, or straight flush 
          this.addOutsToResult(result, this.outsToFlush(holeCards, communityCards));
          this.addOutsToResult(result, this.outsToStraightFlush(holeCards, communityCards));
          break;
        
        case "Three of a Kind":
          // Improvement to full house or four of a kind
          this.addOutsToResult(result, this.outsToFullHouse(holeCards, communityCards));
          this.addOutsToResult(result, this.outsToFourKind(holeCards, communityCards));
          break;
        
        case "Two Pair":
          // Improvement to full house
          this.addOutsToResult(result, this.outsToFullHouse(holeCards, communityCards));
          break;
        
        case "Pair":
          // Improvement to two pair or three of a kind
          this.addOutsToResult(result, this.outsToTwoPair(holeCards, communityCards));
          this.addOutsToResult(result, this.outsToThreeKind(holeCards, communityCards));
          break;
        
        case "High Card":
        default:
          // Improvement to pair
          const overCards = this.checkOverCards(holeCards, communityCards);
          const pairOuts = this.outsToPair(holeCards, communityCards);
          this.addOutsToResult(result, pairOuts);
          break;
      }
      
      // Check for flush draw (independent of current hand)
      if (this.isFlushDraw(holeCards, communityCards)) {
        this.addOutsToResult(result, this.outsToFlush(holeCards, communityCards));
      }
      
      // Check for straight flush draw (independent of current hand)
      this.addOutsToResult(result, this.outsToStraightFlush(holeCards, communityCards));
      
      // Check for straight draw (independent of current hand)
      if (this.isStraightDraw(holeCards, communityCards)) {
        // This adds both OESD and inside straight draws to the result
        const oesdOuts = this.outsToStraightOESD(holeCards, communityCards);
        this.addOutsToResult(result, oesdOuts);
        
        // Here's the key fix: Always check for inside straight draws, regardless of OESD results
        const insideOuts = this.outsToInsideStraightDraw(holeCards, communityCards);
        this.addOutsToResult(result, insideOuts);

        // Here's the key fix: Always check for inside straight draws, regardless of OESD results
        const strightFlushOUts = this.outsToStraightFlush(holeCards, communityCards);
        this.addOutsToResult(result, strightFlushOUts);
      }
      
      // Remove duplicate out cards
      result.outCards = this.removeDuplicateCards(result.outCards);
      
      return result;
    }

    /**
     * Adds the outs from the source array to the result Outs object.
     * Updates the highestOutHand if the new outs have a higher rank.
     */
    private static addOutsToResult(result: Outs, outs: Out[]): void {
      if (!outs || outs.length === 0) return;
      
      // Add each out to the result
      for (const out of outs) {
        result.outs.push(out);
        
        // Add each card from this out to the overall outCards array
        for (const card of out.cardsThatCanMakeHand) {
          result.outCards.push(card);
        }
        
        // Update the highest out hand if needed
        // This is a simple priority-based approach
        const outHandPriority = this.getOutHandPriority(out.outHand);
        const currentPriority = this.getOutHandPriority(result.highestOutHand);
        
        if (outHandPriority > currentPriority) {
          result.highestOutHand = out.outHand;
        }
      }
    }

    /**
     * Returns a numeric priority for a given hand type.
     * Higher numbers represent better hands.
     */
    private static getOutHandPriority(handName: string): number {
      const priorities: {[key: string]: number} = {
        "Royal Flush": 10,
        "Straight Flush": 9,
        "Four of a Kind": 8,
        "Full House": 7,
        "Flush": 6,
        "Straight": 5,
        "Straight (OESD)": 5,
        "Inside Straight Draw": 5,
        "Three of a Kind": 4,
        "Two Pair": 3,
        "Pair": 2,
        "High Card": 1,
        "": 0
      };
      
      return priorities[handName] || 0;
    }

    /**
     * Removes duplicate cards from an array of cards.
     */
    private static removeDuplicateCards(cards: Card[]): Card[] {
      const uniqueCards: Card[] = [];
      const seen = new Set<string>();
      
      for (const card of cards) {
        const cardStr = card.toString();
        if (!seen.has(cardStr)) {
          seen.add(cardStr);
          uniqueCards.push(card);
        }
      }
      
      return uniqueCards;
    }

    /*
     * Evaluates the board texture based on the cards on the board.
    */
    public static evaluateBoard(board: Card[]): BoardTexture {
      if (board.length < 3 || board.length > 5)
        throw new Error(PokerError.InsufficientCommunityCards);
    
      const cardValues = values;

      // Collect suits and determine the index for each card rank.
      const suits = board.map(c => c.suit);
    
      // Use c.value (which should be defined in your Card implementation)
      const ranks = board.map(c => cardValues.indexOf(c.value)).sort((a, b) => a - b);
    
      // If fewer unique ranks than board length, then at least one pair exists.
      const paired = new Set(ranks).size < board.length;
    
      // Count cards per suit.
      const suitCounts = suits.reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      const maxSuit = Math.max(...Object.values(suitCounts));
      const monotone = maxSuit === board.length;   // All cards share the same suit.
      const twoTone = maxSuit === 2;                 // Exactly 2 cards of one suit.
    
      // For connectivity, consider the board length (n).
      const n = board.length;
      // Gap is how much the range spreads beyond a perfectly consecutive sequence.
      const gap = (ranks[n - 1] - ranks[0]) - (n - 1);
      const connectivity = Math.max(0, (n - 1) - gap);
    
      // Straight draw classification:
      // openDraw if the range is <= 4 and there is no pair.
      const openDraw = (ranks[n - 1] - ranks[0] <= 4 && !paired);

      // Gutshot calculation needs to be more specific about gaps
      // Check if there's a "one-card gap" within a 5-card span, which indicates a gutshot
      let gutshot = false;
      if (!openDraw && !paired) {
        // For each possible starting point in a 5-card range
        for (let i = 0; i <= ranks.length - 4; i++) {
          // Calculate total span of 5 consecutive ranks
          const rangeSpan = (ranks[Math.min(i+4, ranks.length-1)] - ranks[i]);
          // If span is 5 or 6 (indicating one gap), and we have 4 cards, it's a gutshot
          if ((rangeSpan === 5 || rangeSpan === 6) && (i+4 < ranks.length || ranks.length >= 4)) {
            gutshot = true;
            break;
          }
        }
      }
    
      // Flush draw present if at least 2 cards are of the same suit.
      const flushDraw = maxSuit >= 2;

      // Determine if the board is wet or dry.
      const wet = (
        monotone ||                             // All cards of the same suit
        maxSuit >= 3 ||                         // Three or more cards of the same suit makes it wet
        flushDraw && (connectivity > 0 || openDraw) ||  // Flush draw combined with straight potential
        connectivity >= 2 ||                    // At least moderately connected
        openDraw ||                             // Open-ended straight draw explicitly present
        (paired && (flushDraw || connectivity > 0)) // Paired boards only considered wet if combined with draws
      );

      const dry = !wet;
      
      // Check if the board contains at least one Broadway card (A, K, Q, J, T)
      const broadwayCards = ["A", "K", "Q", "J", "T"];
      const hasBroadway = board.some(card => broadwayCards.includes(card.value));
      
      // High card board check: Unpaired, disconnected or slightly connected, no flush, AND contains a Broadway card
      const highCard = !paired && connectivity <= 1 && !monotone && maxSuit < 3 && hasBroadway;

      return {
        highCard,
        paired,
        monotone,
        twoTone,
        connectivity,
        straightDraw: openDraw ? 'open' : (gutshot ? 'gutshot' : 'none'),
        flushDraw,
        dry,
        wet
      };
    }

    /**
     * Checks two hole cards against the community cards to see if either card is higher than all the community cards
     * making it an over card
     * 
     * @param hole - Two Card objects representing the hole cards
     * @param community - Three or more Card objects representing the community cards
     * @returns Array of Card objects that are over cards (empty if none found)
     * @throws Error if community cards array is empty
     */
    static checkOverCards(hole: Card[], community: Card[]): Card[] {
        // Validate inputs
        // Log the hole and community cards for debugging
        if (!community || community.length === 0) {
            throw new Error("Community cards must be provided to check for over cards");
        }
        
        // Check if either hand card is higher than all community cards
        const higherCards: Card[] = [];
        
        for (const h of hole) {
            let higher = true;
            
            for (const c of community) {
                // If hole card rank is less than or equal to any community card rank, it's not an over card
                if (h.rank <= c.rank) {
                higher = false;
                break;
                }
            }
            
            if (higher) {
                higherCards.push(h);
            }
        }
        
        return higherCards;
    }

    /*
    * Helper function to determine if a hand is a flush draw 
    */
    static isFlushDraw(holeCards: Card[], communityCards: Card[]): boolean {
      // Combine the hole cards and community cards
      const allCards: Card[] = [...holeCards, ...communityCards];
      
      // Count the cards per suit.
      const suitCounts: { [suit: string]: number } = { s: 0, h: 0, d: 0, c: 0 };
      for (const card of allCards) {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
      }
      
      // A flush draw exists if exactly four cards of any suit are present
      // (assuming the flush is not already made).
      for (const suit of ['s', 'h', 'd', 'c']) {
        if (suitCounts[suit] === 4) {
          return true;
        }
      }
      
      return false;
    }

    /*
    function that detects a straight draw. 
    In this implementation we combine the hole and community cards, extract a sorted, unique list of rank indices (using a fixed ordering), 
    and then iterate over every possible 5‐card straight candidate. 
    If exactly 4 of the 5 needed ranks are present, we consider that a straight draw (either an open‑ended or inside/gutshot draw) exists. 
    This function returns a boolean indicating whether such a draw is detected. 
    It also “considers that it may be a total of 5 of 6 cards” by looking at the possibility of a missing card in a 5‑card sequence.
    */
    static isStraightDraw(holeCards: Card[], communityCards: Card[]): boolean {
      // Combine the hole and community cards.
      const allCards: Card[] = [...holeCards, ...communityCards];
      
      // Define the standard order of card values.
      //      const cardValues = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
      const cardValues = values;    
      // Create a set of unique rank indices according to cardValues.
      const uniqueIndices = new Set<number>();
      for (const card of allCards) {
        const index = cardValues.indexOf(card.value);
        if (index !== -1) uniqueIndices.add(index);
        // Also treat Ace as low if needed (i.e. Ace can represent rank 0 in a 5-high straight)
        if (card.value === 'A') {
          uniqueIndices.add(-1);
        }
      }
      
      // Convert the set to a sorted array.
      const sortedIndices = Array.from(uniqueIndices).sort((a, b) => a - b);
      
      // Look at every possible block of 5 consecutive rank values in cardValues.
      // A straight draw requires that exactly four out of five ranks are present.
      for (let i = -1; i <= cardValues.length - 5; i++) {
        // Build the full candidate sequence: i, i+1, i+2, i+3, i+4.
        const candidate: number[] = [];
        for (let j = 0; j < 5; j++) {
          candidate.push(i + j);
        }
        
        // Count how many of these candidate ranks are present.
        let count = 0;
        for (const rank of candidate) {
          if (sortedIndices.includes(rank)) {
            count++;
          }
        }
        
        // If exactly 4 of the 5 candidate ranks are present, we have a straight draw.
        if (count === 4) {
          return true;
        }
      }
      
      return false;
    }

    /**
     * Evaluates the outs for making a Pair from a high card hand.
     * This updated version returns a separate Out object for each hole card that
     * can form a pair with a missing partner (i.e. candidate outs for that card).
     *
     * The resulting Out object now also populates the cardsHeldForOut field with
     * the card (or cards) from the player's hand that would use the candidate card to make a pair.
     *
     * @param holeCards - An array of exactly 2 cards representing the player's hole cards.
     * @param communityCards - An array of community cards (3–5 cards).
     * @returns Array of Out objects; one for each hole card that can form a pair with a missing partner.
     */
    // Revised outsToPair: Only generate an out for a hole card if its rank beats
    // the highest community card (because pairing a card that is too low won’t improve the hand).
    static outsToPair(holeCards: Card[], communityCards: Card[]): Out[] {
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3) {
        throw new Error("Must provide at least three community cards");
      }
      
      const allCards: Card[] = [...holeCards, ...communityCards];
      // Determine highest community card rank using the shared values order.
      const highestCommunityRank = Math.max(...communityCards.map(c => c.rank));
      
      const outsArray: Out[] = [];
      const suits = ['s', 'h', 'd', 'c'];
      
      // Use only the over cards if available; otherwise, use both hole cards.
      const overCards = HandEvaluator.checkOverCards(holeCards, communityCards);
      const validHoleCards = overCards.length > 0 ? overCards : holeCards;
      
      for (const holeCard of validHoleCards) {
        // Filter: Only consider hole cards whose rank beats the best on board.
        if (holeCard.rank <= highestCommunityRank) {
          continue;
        }
        
        // Skip if a pair is already on board.
        const count = allCards.filter(c => c.value === holeCard.value).length;
        if (count >= 2) continue;
        
        const out = new Out();
        out.outHand = "Pair";
        out.possibleHand = false;
        out.cardNeededCount = 1; // Only one card is needed to complete your pair.
        out.cardsHeldForOut.push(holeCard);
        
        // For each suit (except the hole card’s suit), if that candidate card is not in play, add it.
        for (const suit of suits) {
          if (suit === holeCard.suit) continue;
          const candidateStr = holeCard.value + suit;
          if (allCards.some(c => c.value + c.suit === candidateStr)) continue;
          
          out.cardsThatCanMakeHand.push(new Card(candidateStr));
          out.possibleHand = true;
        }
        
        if (out.possibleHand) {
          outsArray.push(out);
        }
      }
      
      return outsArray;
    }
          
    /**
     * Evaluates the outs for making Two Pair from a one-pair hand.
     * It expects that the full hand (hole + community) currently contains
     * exactly one pair (the lower pair) and at least one candidate card (from the non-paired cards)
     * to pair up for the second pair.
     * For the highest non-paired card (the candidate), this function builds one Out object per missing suit.
     *
     * @param holeCards - Two Card objects representing the player's hole cards.
     * @param communityCards - An array (3–5) of community Card objects.
     * @returns An array of Out objects – one per candidate out – or an empty array if two pair improvement isn’t applicable.
     */
    static outsToTwoPair(holeCards: Card[], communityCards: Card[]): Out[] {
      // Validate inputs.
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
    
      const allCards = [...holeCards, ...communityCards];
      const hand = Hand.solve(allCards.map(c => c.toString()), new Game("standard"));
      const handName = hand.name;
      // Only a one pair hand can be upgraded to two pair.
      if (handName !== "Pair") {
        return [];
      }
    
      // Determine the candidate value from the hole cards.
      // First, if the hole cards are paired, use that value.
      let candidatePair: string | null = null;
      if (holeCards[0].value === holeCards[1].value) {
        candidatePair = holeCards[0].value;
      } else {
        // Otherwise select the hole card that does NOT appear on the board (clean candidate).
        const cleanHoleCandidates = holeCards.filter(
          card => !communityCards.some(comm => comm.value === card.value)
        );
        if (cleanHoleCandidates.length > 0) {
          // Choose the highest-ranked candidate using our authoritative order.
          candidatePair = cleanHoleCandidates.sort(
            (a, b) => values.indexOf(b.value) - values.indexOf(a.value)
          )[0].value;
        }
      }
      
      // If no candidate was determined, return empty.
      if (!candidatePair) return [];
      
      // We require that the candidate appears exactly once (held only in the hole) to form a "clean" improvement.
      const frequency = allCards.filter(card => card.value === candidatePair).length;
      if (frequency !== 1) return [];
    
      // Also, if by chance the candidate appears on the board, then drawing it would form three-of-a-kind
      // rather than a clean two pair.
      if (communityCards.some(card => card.value === candidatePair)) {
        return [];
      }
      
      // Use the candidatePair from the hole as the candidate.
      const candidate = candidatePair;
      
      // Determine which suits for the candidate card are already in play.
      const inPlaySuits = new Set(allCards.filter(c => c.value === candidate).map(c => c.suit));
      const allSuits = ['s', 'h', 'd', 'c'];
      const missingSuits = allSuits.filter(suit => !inPlaySuits.has(suit));
      if (missingSuits.length === 0) {
        return [];
      }
      
      // Create candidate cards for the missing suits.
      const candidateCards: Card[] = missingSuits.map(suit => new Card(candidate + suit));
      
      // Build a single Out object.
      // The held cards for the candidate are those in the full hand that match the candidate value.
      const heldForCandidate = allCards.filter(c => c.value === candidate);
      
      const outCandidate = new Out();
      outCandidate.outHand = "Two Pair";
      outCandidate.possibleHand = true;
      outCandidate.cardNeededCount = 1;
      outCandidate.cardsHeldForOut = heldForCandidate;
      outCandidate.cardsThatCanMakeHand = candidateCards;
      
      return [outCandidate];
    }

    /**
     * Evaluates the outs for making Three of a Kind.
     * It requires that there is a pair (exactly two copies) among the holeCards and communityCards.
     * This updated version returns an array of Out objects – one for each missing suit candidate.
     *
     * @param holeCards - Two Card objects representing the player's hole cards.
     * @param communityCards - An array (3–5) of community Card objects.
     * @returns An array of Out objects. Each Out indicates that only one card (cardNeededCount = 1)
     *          is needed to complete three of a kind based on the candidate pair.
     *
     * If no pair exists in the total hand, three-of-a-kind is not possible and an empty array is returned.
     */
    static outsToThreeKind(holeCards: Card[], communityCards: Card[]): Out[] {
      // Validate inputs.
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      
      const allCards: Card[] = [...holeCards, ...communityCards];
      const rankCount: { [key: string]: number } = {};
      for (const card of allCards) {
        rankCount[card.value] = (rankCount[card.value] || 0) + 1;
      }
      
      // Look for a pair: exactly two cards of the same value.
      let pairValue: string | null = null;
      for (const value in rankCount) {
        if (rankCount[value] === 2) {
          pairValue = value;
          break;
        }
      }
      
      if (!pairValue) return [];
      
      // Get the cards that constitute the pair.
      const cardsHeld = allCards.filter(card => card.value === pairValue);
      
      // For three-of-a-kind, one extra card (of the pair's value) is needed.
      // Determine which suits are missing.
      const allSuits = ['s', 'h', 'd', 'c'];
      const presentSuits = new Set(cardsHeld.map(card => card.suit));
      const missingSuits = allSuits.filter(suit => !presentSuits.has(suit));
      
      if (missingSuits.length === 0) return [];
      
      // Build one Out object that aggregates candidate cards for the improvement.
      const outCandidate = new Out();
      outCandidate.outHand = "Three of a Kind";
      outCandidate.possibleHand = true;
      outCandidate.cardNeededCount = 1;
      outCandidate.cardsHeldForOut = cardsHeld;
      outCandidate.cardsThatCanMakeHand = missingSuits.map(suit => new Card(pairValue + suit));
      
      return [outCandidate];
    }

    /**
     * Evaluates the outs for an open‑ended straight draw (OESD).
     * An OESD draw is present when the hand has four consecutive ranks,
     * missing a card at either the low or high end to complete a 5‑card straight.
     *
     * @param holeCards - Two Card objects representing the hole cards.
     * @param communityCards - Three to five Card objects representing the community cards.
     * @returns An array of Out objects; each Out represents one candidate card that would complete the OESD.
     * @throws Error if inputs are invalid.
     */
    static outsToStraightOESD(holeCards: Card[], communityCards: Card[]): Out[] {
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      
      const allCards = [...holeCards, ...communityCards];
      // Assume an authoritative order array exists:
      const values = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
      
      // Get distinct card values in sorted order (ascending by index)
      const uniqueVals = Array.from(new Set(allCards.map(c => c.value)))
        .sort((a, b) => values.indexOf(a) - values.indexOf(b));
      
      // Look for a contiguous block of 4 values.
      let block: string[] | null = null;
      for (let i = 0; i <= uniqueVals.length - 4; i++) {
        const seq = uniqueVals.slice(i, i + 4);
        let contiguous = true;
        for (let j = 0; j < seq.length - 1; j++) {
          if (values.indexOf(seq[j + 1]) !== values.indexOf(seq[j]) + 1) {
            contiguous = false;
            break;
          }
        }
        if (contiguous) {
          block = seq;
          break;
        }
      }
      if (!block) return [];
      
      // Identify candidate endpoints.
      const lowerIndex = values.indexOf(block[0]) - 1;
      const upperIndex = values.indexOf(block[block.length - 1]) + 1;
      const candidates: Card[] = [];
      const allSuits = ['s','h','d','c'];
      
      if (lowerIndex >= 0) {
        const candidateVal = values[lowerIndex];
        const inPlay = new Set(allCards.filter(c => c.value === candidateVal).map(c => c.suit));
        // For every suit not already in play, add candidate card.
        allSuits.forEach(suit => {
          if (!inPlay.has(suit)) {
            candidates.push(new Card(candidateVal + suit));
          }
        });
      }
      if (upperIndex < values.length) {
        const candidateVal = values[upperIndex];
        const inPlay = new Set(allCards.filter(c => c.value === candidateVal).map(c => c.suit));
        allSuits.forEach(suit => {
          if (!inPlay.has(suit)) {
            candidates.push(new Card(candidateVal + suit));
          }
        });
      }
      
      // In our test, for block ["9", "T", "J", "Q"]:
      // lowerIndex gives candidate "8" ⇒ returns four candidate 8's,
      // upperIndex gives candidate "K" ⇒ returns four candidate K's,
      // so total candidate outs = 8.
      
      // For the held cards, return one representative card for each value in block.
      const heldBlock: Card[] = [];
      block.forEach(val => {
        const card = allCards.find(c => c.value === val);
        if (card) heldBlock.push(card);
      });
      
      const out = new Out();
      out.outHand = "Straight (OESD)";
      out.possibleHand = true;
      out.cardNeededCount = 1;
      out.cardsHeldForOut = heldBlock;
      out.cardsThatCanMakeHand = candidates;
      
      return [out];
    }
    
    /**
     * Evaluates the outs for an inside straight draw (gutshot).
     * An inside straight draw is present when the hand has 4 cards that could form a straight with one missing card.
     *
     * @param holeCards - Two Card objects representing the hole cards.
     * @param communityCards - Three to five Card objects representing the community cards.
     * @returns An array containing a single Out object (or empty if no inside straight draw is found).
     * @throws Error if fewer than 4 cards are provided.
     */
    static outsToInsideStraightDraw(holeCards: Card[], communityCards: Card[]): Out[] {
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      
      const allCards = [...holeCards, ...communityCards];
      if (allCards.length < 4) {
        throw new Error("At least four cards are required to check for an inside straight draw");
      }
      
      const cardValues = values; // e.g., ["2","3","4","5","6","7","8","9","T","J","Q","K","A"]
      const uniqueRanks = Array.from(new Set(allCards.map(card => cardValues.indexOf(card.value)))).sort((a, b) => a - b);
      
      // If a complete straight is already made, return no draw.
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) {
          return [];
        }
      }
      
      const suits = ['s', 'h', 'd', 'c'];
      const inPlay = new Set(allCards.map(card => card.value + card.suit));
      // Prepare a sorted copy of community cards.
      const sortedCommunity = communityCards.slice().sort((a, b) => cardValues.indexOf(a.value) - cardValues.indexOf(b.value));
      
      let bestCandidateOut: Out | null = null;
      let bestMissingRankIndex = Infinity;
      let bestPresentSum = Infinity;
      
      // Search all possible 5-card spans.
      for (let i = 0; i <= cardValues.length - 5; i++) {
        const span = [i, i+1, i+2, i+3, i+4];
        const present = span.filter(idx => uniqueRanks.includes(idx));
        if (present.length === 4) {
          const missingRankIndex = span.find(idx => !uniqueRanks.includes(idx));
          if (missingRankIndex === undefined) continue;
          
          // NEW: Skip spans where the missing card is an extreme (open-ended),
          // so we only consider inside (gutshot) draws.
          if (missingRankIndex === span[0] || missingRankIndex === span[4]) {
            continue;
          }
          
          // Build the held cards for this candidate by preferring community cards.
          const straightCards: Card[] = [];
          for (const rankIndex of span) {
            if (rankIndex !== missingRankIndex) {
              let cardWithRank = sortedCommunity.find(card => cardValues.indexOf(card.value) === rankIndex);
              if (!cardWithRank) {
                cardWithRank = holeCards.find(card => cardValues.indexOf(card.value) === rankIndex);
              }
              if (cardWithRank) {
                straightCards.push(cardWithRank);
              }
            }
          }
          if (straightCards.length !== 4) continue;
          
          // Build candidate cards for the missing rank.
          const missingRankValue = cardValues[missingRankIndex];
          const candidateCards: Card[] = [];
          for (const suit of suits) {
            const candidateStr = missingRankValue + suit;
            if (!inPlay.has(candidateStr)) {
              candidateCards.push(new Card(candidateStr));
            }
          }
          if (candidateCards.length === 0) continue;
          
          // Compute the sum of present rank indices.
          const presentSum = present.reduce((sum, r) => sum + r, 0);
          
          // New tie-breaking: prefer lower missingRankIndex, and if equal, lower presentSum.
          if (
              bestCandidateOut === null ||
              missingRankIndex < bestMissingRankIndex ||
              (missingRankIndex === bestMissingRankIndex && presentSum < bestPresentSum)
          ) {
            bestMissingRankIndex = missingRankIndex;
            bestPresentSum = presentSum;
            const outCandidate = new Out();
            outCandidate.outHand = "Inside Straight Draw";
            outCandidate.possibleHand = true;
            outCandidate.cardNeededCount = 1;
            outCandidate.cardsHeldForOut = straightCards;
            outCandidate.cardsThatCanMakeHand = candidateCards;
            bestCandidateOut = outCandidate;
          }
        }
      }
      
      return bestCandidateOut ? [bestCandidateOut] : [];
    }

    /*
      • Validate the inputs.
      • Combine the hole + community cards and then, for each suit, check if exactly 4 cards are present (indicating a flush draw).
      • For that suit, we iterate over the standard card order (using the cardValues array) and for each rank not already in play we create a separate Out object.
      • Each Out returns only that candidate card, sets cardNeededCount to 1 (because only one card is needed to complete the flush) and populates cardsHeldForOut with the flush-draw cards.
    */
      static outsToFlush(holeCards: Card[], communityCards: Card[]): Out[] {
        if (!holeCards || holeCards.length !== 2) {
          throw new Error("Must provide exactly two hole cards");
        }
        if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
          throw new Error("Community cards must be between 3 and 5");
        }
        
        const allCards: Card[] = [...holeCards, ...communityCards];
        // Use the authoritative rank order.
        const cardValues = values; // e.g., ["2","3","4","5","6","7","8","9","T","J","Q","K","A"] 
        const suits = ['s', 'h', 'd', 'c'];
        const outArray: Out[] = [];
        
        // For each suit, check if exactly 4 cards are present (indicating a flush draw).
        for (const suit of suits) {
          const suitCards = allCards.filter(card => card.suit === suit);
          if (suitCards.length === 4) {
            // Build candidate cards by iterating over the cardValues.
            const candidateCards: Card[] = [];
            for (const rank of cardValues) {
              // Skip the "1" rank (if present in your values array).
              if (rank === "1") continue;
              // If a card with the rank and suit is not already in play, add it.
              if (!allCards.some(card => card.value === rank && card.suit === suit)) {
                candidateCards.push(new Card(rank + suit));
              }
            }
            
            // Create a single Out object for this flush draw.
            const outCandidate = new Out();
            outCandidate.outHand = "Flush";
            outCandidate.possibleHand = true;
            // Only one card is needed to complete the flush draw.
            outCandidate.cardNeededCount = 1;
            // The held cards are the cards in this suit (already in play).
            outCandidate.cardsHeldForOut = suitCards;
            // Aggregate all candidate cards (missing from the hand) for completion.
            outCandidate.cardsThatCanMakeHand = candidateCards;
            
            outArray.push(outCandidate);
          }
        }
        
        return outArray;
      }

    /*
     The function combines the hole cards and community cards, checks for trips or for two pair, and then generates candidate outs by iterating over all suits for the relevant card ranks (excluding those already in play).
    • It sets the Out object’s properties accordingly.
    • The accompanying unit tests (Mocha + Chai) verify proper error handling, the trips scenario, the two-pair scenario, and when no full house outs exist.
    In this code we build a frequency map (using each card’s value) and then check for trips (freq >= 3) and, if not found, for a two‑pair scenario (exactly two ranks with count == 2). 
    In each case we generate the candidate outs by iterating over all four suits and excluding those cards already in play.
    */
    static outsToFullHouse(holeCards: Card[], communityCards: Card[]): Out[] {
      // Validate inputs.
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      const allCards: Card[] = [...holeCards, ...communityCards];
      if (allCards.length < 5) {
        throw new Error("At least five cards are required to evaluate a full house draw");
      }
      
      // First, check if the hand is already a full house.
      const freq: Record<string, number> = {};
      for (const card of allCards) {
        freq[card.value] = (freq[card.value] || 0) + 1;
      }
      const ranks = Object.keys(freq);
      const alreadyFullHouse = ranks.some(
        r => freq[r] >= 3 && ranks.some(r2 => r2 !== r && freq[r2] >= 2)
      );
      if (alreadyFullHouse) {
        throw new Error("Hand already made full house");
      }
      
      const suits = ['s', 'h', 'd', 'c'];
      const outs: Out[] = [];
      
      // Scenario 1: Trips scenario.
      // Look for a rank that appears at least three times.
      let tripsRank: string | null = null;
      for (const r in freq) {
        if (freq[r] >= 3) {
          tripsRank = r;
          break;
        }
      }
      if (tripsRank) {
        // Held trip cards.
        const tripsCards = allCards.filter(card => card.value === tripsRank);
        // Consider candidate ranks different from tripsRank.
        const candidateRanks = Array.from(
          new Set(allCards.filter(card => card.value !== tripsRank).map(card => card.value))
        );
        // We want to form a pair from the candidate rank. That means
        // if a candidate already appears once, drawing one card would pair it.
        // (We ignore candidates that appear 0 times.)
        let aggregatedCandidateCards: Card[] = [];
        let heldForCandidate: Card[] = [];
        for (const cand of candidateRanks) {
          const candCount = allCards.filter(card => card.value === cand).length;
          if (candCount === 1) {
            // For outs, return candidate cards for this rank that are not already in play.
            const candidatesForRank = suits
              .filter(suit => !allCards.some(card => card.value === cand && card.suit === suit))
              .map(suit => new Card(cand + suit));
            aggregatedCandidateCards = aggregatedCandidateCards.concat(candidatesForRank);
            heldForCandidate = heldForCandidate.concat(allCards.filter(card => card.value === cand));
          }
        }
        if (aggregatedCandidateCards.length > 0) {
          const outCandidate = new Out();
          outCandidate.outHand = "Full House";
          outCandidate.possibleHand = true;
          outCandidate.cardNeededCount = 1;
          // The held cards include both the trips and any candidate already present.
          outCandidate.cardsHeldForOut = tripsCards.concat(heldForCandidate);
          // Aggregate all candidate cards (only those missing from play).
          outCandidate.cardsThatCanMakeHand = aggregatedCandidateCards;
          outs.push(outCandidate);
        }
      }
      
      // Scenario 2: Two pair scenario.
      // If no trips exist, check for two distinct pair ranks.
      const pairRanks = Object.keys(freq).filter(r => freq[r] === 2);
      if (pairRanks.length >= 2) {
        let aggregatedCandidateCards: Card[] = [];
        let heldForCandidate: Card[] = [];
        for (const pr of pairRanks) {
          // For a pair that already exists, drawing one more card of that rank would form trips.
          // Aggregate only candidate cards that are not already in play.
          const candidatesForRank = suits
            .filter(suit => !allCards.some(card => card.value === pr && card.suit === suit))
            .map(suit => new Card(pr + suit));
          aggregatedCandidateCards = aggregatedCandidateCards.concat(candidatesForRank);
          heldForCandidate = heldForCandidate.concat(allCards.filter(card => card.value === pr));
        }
        if (aggregatedCandidateCards.length > 0) {
          const outCandidate = new Out();
          outCandidate.outHand = "Full House";
          outCandidate.possibleHand = true;
          outCandidate.cardNeededCount = 1;
          outCandidate.cardsHeldForOut = heldForCandidate;
          outCandidate.cardsThatCanMakeHand = aggregatedCandidateCards;
          outs.push(outCandidate);
        }
      }
      
      return outs;
    }

    /**
     * Evaluates the outs for making a Straight Flush.
     * It uses the candidate outs from inside straight draw and open-ended straight draw,
     * then filters those by the flush draw suit.
     * For each candidate that meets the flush condition, a separate Out object is returned.
     *
     * @param holeCards - Two Card objects representing the hole cards.
     * @param communityCards - 3 to 5 Card objects representing the community cards.
     * @returns Array of Out objects for each candidate that would result in a Straight Flush draw.
     */
    static outsToStraightFlush(holeCards: Card[], communityCards: Card[]): Out[] {
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      const allCards = [...holeCards, ...communityCards];
      
      // Determine a candidate flush suit: we’re looking for a suit present exactly 4 times (flush draw)
      const suits = ['s', 'h', 'd', 'c'];
      let flushSuit: string | null = null;
      for (const s of suits) {
        const cardsOfSuit = allCards.filter(card => card.suit === s);
        if (cardsOfSuit.length === 4) {
          flushSuit = s;
          break;
        }
      }
      if (!flushSuit) return [];
      
      // Work only with cards in the flush suit.
      const flushCards = allCards.filter(card => card.suit === flushSuit);
      
      // Define the card order (using T instead of 10)
      const cardValues = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
      
      // Map flush cards to their rank indices.
      const flushIndices = flushCards.map(card => cardValues.indexOf(card.value)).sort((a,b) => a - b);
      if (flushIndices.length < 4) return [];
      
      // Look for a contiguous block of 4 cards in the flush suit.
      let blockStart = -1;
      for (let i = 0; i <= flushIndices.length - 4; i++){
        if (flushIndices[i+3] - flushIndices[i] === 3) {
          blockStart = flushIndices[i];
          break;
        }
      }
      if (blockStart === -1) return [];
      
      // The desired contiguous block (the held cards) spans from blockStart to blockStart+3.
      const heldRankValues: string[] = [];
      for (let r = blockStart; r < blockStart + 4; r++){
        heldRankValues.push(cardValues[r]);
      }
      const heldCards = flushCards.filter(card => heldRankValues.includes(card.value));
            
      // For a 5-card straight flush draw, the full span would be from blockStart to blockStart+4.
      // Determine the candidate outs (missing endpoints) – lower and upper.
      const candidates: Card[] = [];
      if (blockStart > 0) {
        const lowerCandidate = new Card(cardValues[blockStart - 1] + flushSuit);
        if (!allCards.some(card => card.toString() === lowerCandidate.toString())) {
          candidates.push(lowerCandidate);
        }
      }
      if (blockStart + 4 < cardValues.length) {
        const upperCandidate = new Card(cardValues[blockStart + 4] + flushSuit);
        if (!allCards.some(card => card.toString() === upperCandidate.toString())) {
          candidates.push(upperCandidate);
        }
      }
      if (candidates.length === 0) return [];
      
      const outCandidate = new Out();
      outCandidate.outHand = "Straight Flush";
      outCandidate.possibleHand = true;
      outCandidate.cardNeededCount = 1;
      outCandidate.cardsHeldForOut = heldCards;
      outCandidate.cardsThatCanMakeHand = candidates;
      return [outCandidate];
    }

    static outsToFourKind(holeCards: Card[], communityCards: Card[]): Out[] {
      // Validate inputs.
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      const allCards: Card[] = [...holeCards, ...communityCards];
      if (allCards.length < 5) {
        throw new Error("At least five cards are required to evaluate a four of a kind draw");
      }
      
      // Count occurrences for each card value.
      const freq: Record<string, number> = {};
      for (const card of allCards) {
        freq[card.value] = (freq[card.value] || 0) + 1;
      }
      
      // Look for a rank that appears exactly three times (a three‑of-a‑kind).
      let tripleRank: string | null = null;
      for (const rank in freq) {
        if (freq[rank] === 3) {
          tripleRank = rank;
          break;
        }
      }
      if (!tripleRank) return [];
      
      // The held cards forming the triple.
      const heldCards = allCards.filter(card => card.value === tripleRank);
      
      // Determine which suit(s) are missing.
      const allSuits = ['s', 'h', 'd', 'c'];
      const presentSuits = new Set(heldCards.map(card => card.suit));
      const missingSuits = allSuits.filter(suit => !presentSuits.has(suit));
      
      // For each missing suit, create a separate Out candidate.
      const outsArray: Out[] = [];
      missingSuits.forEach(suit => {
        const outCandidate = new Out();
        outCandidate.outHand = "Four of a Kind";
        outCandidate.possibleHand = true;
        // Only one card is needed to complete the four-of-a-kind.
        outCandidate.cardNeededCount = 1;
        outCandidate.cardsThatCanMakeHand.push(new Card(tripleRank + suit));
        // Record the held triple—this shows which cards are contributing to the draw.
        outCandidate.cardsHeldForOut = heldCards.slice();
        outsArray.push(outCandidate);
      });
      
      return outsArray;
    }
  }