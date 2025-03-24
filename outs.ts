// Import the Hand class from your handsolver file as HandSolver.
import { Card, values, Hand, Game } from './pokersolver';

// Define card values in ascending order (same as in pokersolver)
// const values = {
//     '2': 0,
//     '3': 1,
//     '4': 2,
//     '5': 3,
//     '6': 4,
//     '7': 5,
//     '8': 6,
//     '9': 7,
//     'T': 8,
//     'J': 9,
//     'Q': 10,
//     'K': 11,
//     'A': 12
//   };

  // const gameRules: { [key: string]: GameRule } = {
  //   standard: {
  //     cardsInHand: 5,
  //     handValues: [
  //       StraightFlush,
  //       FourOfAKind,
  //       FullHouse,
  //       Flush,
  //       Straight,
  //       ThreeOfAKind,
  //       TwoPair,
  //       OnePair,
  //       HighCard,
  //     ],

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
    paired: false,  // true if there is a pair on the board
    monotone: false,  // true if all cards are of the same suit
    twoTone: false,  // true if there are two suits on the board
    connectivity: 0,  // 0 = disconnected → 4 = highly connected
    straightDraw: 'none',  // 'none', 'gutshot', or 'open'
    flushDraw: false
  };
}

export interface BoardTexture {
  paired: boolean
  monotone: boolean
  twoTone: boolean
  connectivity: number    // 0 = disconnected → 4 = highly connected
  straightDraw: 'none'|'gutshot'|'open'
  flushDraw: boolean
}

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
        const allCards = [...holeCards.map(c => new Card(c.value + c.suit + c.rank)), ...communityCards.map(c => new Card(c.value + c.suit + c.rank))];
        return allCards;
      }

    //TODO - Need to adjust calculateOuts()
        // - Starting point is the best hand that can be made with community only cards, not just the players hand
        // - 	1.	Clean outs → improve your hand without likely giving opponents a better one
	      // -  2.	Dirty outs → improve you but also create a stronger hand for someone else (or tie)
        // 1.	List every card that completes your best hand.
        // 2.	Subtract any card that would ALSO give a better hand to an opponent.
        // 3.	Subtract any card that makes the board a strong hand on its own (full house, straight, flush)
    // TDOO - Need to calculate the board texture
    static calculateOuts(holeCards: Card[], communityCards: Card[]): Outs {
      // check if hand is preflop
      const outsContainer = new Outs();

      // If preflop, return empty outs.
      if (communityCards.length < 3) {
        console.info("calculateOuts() - hand is preflop, returning empty outs");
        return outsContainer;
      }

      // Set the cards onto the result
      outsContainer.communityCards = communityCards;
      outsContainer.holeCards = holeCards;
      if (communityCards.length === 3) {
        outsContainer.handStage = "Flop";
      } else if (communityCards.length === 4) { 
        outsContainer.handStage = "Turn";
      } else if (communityCards.length === 5) { 
        outsContainer.handStage = "River";
      }

      // Evaluate the board texture
      outsContainer.boardTexture = HandEvaluator.evaluateBoard(communityCards);

      // create a Hand object from the hole and community cards
      const allCards = HandEvaluator.combineHoleAndCommunity(holeCards, communityCards);
      const game = new Game("standard");
      const hand = Hand.solve(allCards, game);
  
      // We check from high card upward
      if (hand.name === HandRankings.highCard) {
        const outs = this.outsToPair(holeCards, communityCards);

        if (outs && outs.length > 0) {
          for (const o of outs) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = outs[0].outHand;
        }
      }

      if ( hand.name === HandRankings.pair ) {
        const outs = this.outsToTwoPair(holeCards, communityCards);
        if (outs && outs.length > 0) {
          for (const o of outs) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = outs[0].outHand;
        }

        const outs3 = this.outsToThreeKind(holeCards, communityCards);
        if (outs3 && outs3.length > 0) {
          for (const o of outs3) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = outs3[0].outHand;
        }
      }      

      if ( hand.name === HandRankings.twopair ) {
        const outs = this.outsToFullHouse(holeCards, communityCards);
        if (outs && outs.length > 0) {
          for (const o of outs) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = outs[0].outHand;
        }
      }

      if ( hand.name === HandRankings.threeofakind ) {
        const outs = this.outsToFullHouse(holeCards, communityCards);
        if (outs && outs.length > 0) {
          for (const o of outs) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = outs[0].outHand;
        }

        const out4 = this.outsToFourKind(holeCards, communityCards);
        if (out4 && out4.length > 0) {
          for (const o of out4) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = out4[0].outHand;
        }
      }

      // if this is a flush draw check for a flush out
      const isFlushDraw = this.isFlushDraw(holeCards, communityCards);
      if (isFlushDraw) {
        const outs = this.outsToFlush(holeCards, communityCards);
        if (outs && outs.length > 0) {
          for (const o of outs) {
            outsContainer.outs.push(o);
          }
          outsContainer.highestOutHand = outs[0].outHand;
        }
      }
      
      const isStraightDraw = this.isStraightDraw(holeCards, communityCards);
      if (isStraightDraw) {
        try {
          const outs = this.outsToStraightOESD(holeCards, communityCards);
          if (outs && outs.length > 0) {
            for (const o of outs) {
              outsContainer.outs.push(o);
            }
            outsContainer.highestOutHand = outs[0].outHand;
          }
        } catch (e) {
          console.error("calculateOuts() - Error in outsToStraightOESD:", e);
        }

        try {
          const outs = this.outsToInsideStraightDraw(holeCards, communityCards);
          if (outs && outs.length > 0) {
            for (const o of outs) {
              outsContainer.outs.push(o);
            }
            outsContainer.highestOutHand = outs[0].outHand;
          }
        } catch (e) {
          console.error("calculateOuts() - Error in outsToStraightGutshot:", e);
        }
      }

      if (hand.name === HandRankings.straight) {
        if (isFlushDraw) {
          const outs = this.outsToStraightFlush(holeCards, communityCards);
          if (outs && outs.length > 0) {
            for (const o of outs) {
              outsContainer.outs.push(o);
            }
            outsContainer.highestOutHand = outs[0].outHand;
          }
        }
      }

      // Consolidate unique candidate outs, ensure no duplicates
      for (const candidateOut of outsContainer.outs) {
        for (const card of candidateOut.cardsThatCanMakeHand) {
          const candidateCardStr = card.toString(); // assumes toString() returns a unique identifier like "Ah"
          if (!outsContainer.outCards.some(existingCard => existingCard.toString() === candidateCardStr)) {
            outsContainer.outCards.push(card);
          }
        }
      }

      // Calculate the four and two percentages
      if (outsContainer.handStage === "Flop") {
        outsContainer.fourAndTwoPercent = outsContainer.outCards.length * 4;
      }
      else if (outsContainer.handStage === "Turn") {
        outsContainer.fourAndTwoPercent = outsContainer.outCards.length * 2;
      }

      return outsContainer;
    }

    /*
     * Evaluates the board texture based on the cards on the board.
    */
    static evaluateBoard(board: Card[]): BoardTexture {
      if (board.length < 3 || board.length > 5)
        throw new Error(PokerError.InsufficientCommunityCards);
    
      // Use the shared cardValues if available, otherwise fallback to a standard array.
      const cardValues = (values && values.length > 0)
        ? values
        : ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
    
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
      // Gutshot if not open-ended but connectivity is present.
      const gutshot = !openDraw && connectivity >= 2 && !paired;
    
      // Flush draw present if at least 2 cards are of the same suit.
      const flushDraw = maxSuit >= 2;
    
      return {
        paired,
        monotone,
        twoTone,
        connectivity,
        straightDraw: openDraw ? 'open' : (gutshot ? 'gutshot' : 'none'),
        flushDraw,
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
      const cardValues = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
      
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
    static outsToPair(holeCards: Card[], communityCards: Card[]): Out[] {
      // Validate inputs.
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3) {
        throw new Error("Must provide at least three community cards");
      }
      
      // Use only the hole cards that are considered over cards.
      const overCards = HandEvaluator.checkOverCards(holeCards, communityCards);
      // If at least one hole card is over, use only those; if none, use all.
      const validHoleCards = overCards.length > 0 ? overCards : holeCards;
      
      const allCards: Card[] = [...holeCards, ...communityCards];
      const outsArray: Out[] = [];
      const suits = ['s', 'h', 'd', 'c'];
      
      // Process each valid hole card.
      for (const holeCard of validHoleCards) {
        // Skip if a pair is already present.
        const count = allCards.filter(c => c.value === holeCard.value).length;
        if (count >= 2) {
          continue;
        }
        
        const out = new Out();
        out.outHand = "Pair";
        out.possibleHand = false;
        out.cardNeededCount = 0;
        out.cardsHeldForOut.push(holeCard);
        
        // For each suit other than the one in the hole card,
        // if that candidate card is not already in play, add it.
        for (const suit of suits) {
          if (suit === holeCard.suit) continue;
          const candidateStr = holeCard.value + suit;
          if (allCards.some(c => c.value + c.suit === candidateStr)) continue;
          
          out.cardsThatCanMakeHand.push(new Card(candidateStr));
          out.cardNeededCount += 1;
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

      const allCards: Card[] = [...holeCards, ...communityCards];
      // Count occurrences by rank.
      const rankCount: { [val: string]: number } = {};
      for (const card of allCards) {
        rankCount[card.value] = (rankCount[card.value] || 0) + 1;
      }
      // Determine ranks that are paired (count >= 2)
      const pairValues = Object.keys(rankCount).filter(val => rankCount[val] >= 2);
      // For two pair improvement, we expect exactly one pair already.
      if (pairValues.length !== 1) {
        return [];
      }
      const existingPair = pairValues[0];

      // Create a sorted copy of the full hand (using Card.sort, descending order).
      const sortedCards = allCards.slice().sort(Card.sort);
      // Extract non-paired cards.
      const nonPairCards = sortedCards.filter(card => card.value !== existingPair);
      if (nonPairCards.length === 0) return [];
      // Use the highest non-paired card as the candidate for forming the second pair.
      const candidate = nonPairCards[0];
      // Determine which suits of the candidate value are already in play.
      const allSuits = ['s', 'h', 'd', 'c'];
      const presentSuits = new Set(
        allCards.filter(card => card.value === candidate.value).map(card => card.suit)
      );
      const missingSuits = allSuits.filter(suit => !presentSuits.has(suit));

      // For each missing suit, create an Out object.
      const outs: Out[] = [];
      missingSuits.forEach(suit => {
        const out = new Out();
        out.outHand = "Two Pair";
        out.possibleHand = true;
        // Since only one card is needed from this candidate to form a pair,
        // we now set cardNeededCount to 1.
        out.cardNeededCount = 1;
        out.cardsThatCanMakeHand.push(new Card(candidate.value + suit));
        // Also record the cards already in hand contributing to the candidate.
        out.cardsHeldForOut = allCards.filter(card => card.value === candidate.value);
        outs.push(out);
      });

      return outs;
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
      // Iterate over all suits to see which ones are missing.
      const allSuits = ['s', 'h', 'd', 'c'];
      const presentSuits = new Set(cardsHeld.map(card => card.suit));
      const missingSuits = allSuits.filter(suit => !presentSuits.has(suit));
      
      const outsArray: Out[] = [];
      missingSuits.forEach(suit => {
        const out = new Out();
        out.outHand = "Three of a Kind";
        out.possibleHand = true;
        out.cardNeededCount = 1;
        out.cardsThatCanMakeHand.push(new Card(pairValue + suit));
        // Record which cards are held that form the pair.
        out.cardsHeldForOut = cardsHeld;
        outsArray.push(out);
      });
      
      return outsArray;
    }

    /**
     * Evaluates the outs for an open‑ended straight draw (OESD).
     * An OESD draw is present when the hand has four consecutive ranks,
     * missing a card at either the low or high end to complete a 5‑card straight.
     * This version returns an array of Out objects – one per candidate missing card.
     * Each candidate Out indicates that only one card (cardNeededCount = 1) is needed.
     *
     * @param holeCards - Two Card objects representing the hole cards.
     * @param communityCards - Three to five Card objects representing the community cards.
     * @returns An array of Out objects; each Out represents one candidate card that would complete the OESD.
     * @throws Error if inputs are invalid.
     */
    static outsToStraightOESD(holeCards: Card[], communityCards: Card[]): Out[] {
      if (!holeCards || holeCards.length !== 2)
        throw new Error("Must provide exactly two hole cards");
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5)
        throw new Error("Community cards must be between 3 and 5");
        
      const allCards: Card[] = [...holeCards, ...communityCards];
      if (allCards.length < 5)
        throw new Error("At least five cards are required to evaluate an open ended straight draw");
      
      // Use provided card values or fallback to standard order.
      const cardValues = (Array.isArray(values) && values.length > 0)
        ? values
        : ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
      
      // Sort cards by rank order.
      const sortedCards = [...allCards].sort((a, b) => cardValues.indexOf(a.value) - cardValues.indexOf(b.value));
      
      // Create a unique set of rank indices.
      const uniqueRanks = Array.from(new Set(sortedCards.map(card => cardValues.indexOf(card.value)))).sort((a, b) => a - b);
      
      const results: Out[] = [];
      const suits = ['s', 'h', 'd', 'c'];
      const inPlay = new Set(allCards.map(card => card.value + card.suit));
      
      // Helper to get held cards from a block (the cards that are already in the contiguous sequence).
      const getHeldCardsForBlock = (block: number[]): Card[] => {
        const held: Card[] = [];
        for (const rankIndex of block) {
          const cardVal = cardValues[rankIndex];
          const card = sortedCards.find(c => c.value === cardVal);
          if (card) held.push(card);
        }
        return held;
      };
      
      // Look for any contiguous block of 4 ranks.
      for (let i = 0; i <= uniqueRanks.length - 4; i++) {
        const block = uniqueRanks.slice(i, i + 4);
        if (block[3] - block[0] === 3) {
          const heldForBlock = getHeldCardsForBlock(block);
          // Candidate missing ranks: one below and one above the current block (if in range).
          const candidateMissingIndices: number[] = [];
          if (block[0] > 0) candidateMissingIndices.push(block[0] - 1);
          if (block[3] < cardValues.length - 1) candidateMissingIndices.push(block[3] + 1);
          const missingIndices = Array.from(new Set(candidateMissingIndices));
          
          missingIndices.forEach(missingIndex => {
            const missingValue = cardValues[missingIndex];
            suits.forEach(suit => {
              const candidateStr = missingValue + suit;
              if (!inPlay.has(candidateStr)) {
                const outCandidate = new Out();
                outCandidate.outHand = "Straight (OESD)";
                outCandidate.possibleHand = true;
                outCandidate.cardsHeldForOut = heldForBlock;
                outCandidate.cardsThatCanMakeHand.push(new Card(candidateStr));
                outCandidate.cardNeededCount = 1;
                results.push(outCandidate);
              }
            });
          });
        }
      }
      
      return results;
    }
    
    /**
     * Evaluates the outs for an inside straight draw (gutshot).
     * An inside straight draw is present when the hand has 4 cards within a 5-card span with one missing rank in the middle.
     * This updated version returns an array of Out objects—one for each candidate missing card.
     * Each Out indicates that only one card (cardNeededCount = 1) is needed to complete the draw.
     * The cardsHeldForOut field is populated with the cards from the hand that are used to form the draw.
     *
     * @param holeCards - Two Card objects representing the hole cards.
     * @param communityCards - Three to five Card objects representing the community cards.
     * @returns An array of Out objects representing each candidate inside straight draw.
     * @throws Error if fewer than 4 cards are provided.
     */
    static outsToInsideStraightDraw(holeCards: Card[], communityCards: Card[]): Out[] {
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      
      const cards = [...holeCards, ...communityCards];
      if (cards.length < 4) {
        throw new Error("At least four cards are required to check for an inside straight draw");
      }
      
      const outArray: Out[] = [];
      // Use the provided card order or default to standard Texas Hold'em order.
      const cardValues = (Array.isArray(values) && values.length > 0)
        ? values
        : ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
      
      // Sort cards by rank order (ascending).
      const sortedCards = [...cards].sort((a, b) => cardValues.indexOf(a.value) - cardValues.indexOf(b.value));
      
      // Create a unique list of rank indices from the sorted cards.
      const uniqueRanks = Array.from(new Set(sortedCards.map(card => cardValues.indexOf(card.value)))).sort((a, b) => a - b);
      
      // Helper: given a combination of rank indices, return the held cards (first found per rank) from sortedCards.
      const getHeldCardsForCombo = (combo: number[]): Card[] => {
        const held: Card[] = [];
        for (const rankIndex of combo) {
          const rankVal = cardValues[rankIndex];
          const found = sortedCards.find(c => c.value === rankVal);
          if (found) {
            held.push(found);
          }
        }
        return held;
      };

      // Build a set of cards already in play (e.g. "5h", "6d").
      const inPlay = new Set(cards.map(card => card.value + card.suit));
      const suits = ['s', 'h', 'd', 'c'];
      
      // Helper: generate all combinations of k elements from an array.
      const combinations = (arr: number[], k: number): number[][] => {
        const results: number[][] = [];
        const combine = (start: number, combo: number[]) => {
          if (combo.length === k) {
            results.push([...combo]);
            return;
          }
          for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            combine(i + 1, combo);
            combo.pop();
          }
        };
        combine(0, []);
        return results;
      };
      
      // Generate all combinations of 4 rank indices from uniqueRanks.
      const combos = combinations(uniqueRanks, 4);
      for (const combo of combos) {
        const min = Math.min(...combo);
        const max = Math.max(...combo);
        // For an inside straight draw (gutshot), the span must be exactly 4.
        if (max - min === 4) {
          // In a complete 5-card straight from min to max, one rank will be missing.
          const fullRange = [];
          for (let r = min; r <= max; r++) {
            fullRange.push(r);
          }
          const missing = fullRange.filter(r => !combo.includes(r));
          if (missing.length === 1) {
            const missingRank = missing[0];
            // For each suit candidate of the missing rank, if not already in play, create a separate Out.
            for (const suit of suits) {
              const candidateStr = cardValues[missingRank] + suit;
              if (!inPlay.has(candidateStr)) {
                const o = new Out();
                o.outHand = "Inside Straight Draw";
                o.possibleHand = true;
                o.cardNeededCount = 1; // Only one card is needed to complete the draw.
                o.cardsHeldForOut = getHeldCardsForCombo(combo);
                o.cardsThatCanMakeHand.push(new Card(candidateStr));
                outArray.push(o);
              }
            }
          }
        }
      }
      
      return outArray;
    }

    /*
      • Validate the inputs.
      • Combine the hole + community cards and then, for each suit, check if exactly 4 cards are present (indicating a flush draw).
      • For that suit, we iterate over the standard card order (using the cardValues array) and for each rank not already in play we create a separate Out object.
      • Each Out returns only that candidate card, sets cardNeededCount to 1 (because only one card is needed to complete the flush) and populates cardsHeldForOut with the flush-draw cards.
    */
    static outsToFlush(holeCards: Card[], communityCards: Card[]): Out[] {
      // Validate inputs.
      if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
      }
      if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
      }
      
      // Combine hole cards and community cards.
      const allCards: Card[] = [...holeCards, ...communityCards];
      // Use provided card values order or fallback to standard Texas Hold'em order.
      const cardValues = (Array.isArray(values) && values.length > 0)
        ? values
        : ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
        
      const suits = ['s', 'h', 'd', 'c'];
      const outArray: Out[] = [];
      
      // For each suit, check if there's a flush draw 
      // (defined as exactly 4 cards in that suit).
      for (const suit of suits) {
        const suitCards = allCards.filter(card => card.suit === suit);
        if (suitCards.length === 4) {
          // We have a flush draw for the given suit.
          // For each rank in our order, if a card with that rank and suit is missing,
          // create an Out candidate.
          for (const rank of cardValues) {
            if (!allCards.some(card => card.value === rank && card.suit === suit)) {
              const candidate = new Card(rank + suit);
              const outCandidate = new Out();
              outCandidate.outHand = "Flush";
              outCandidate.possibleHand = true;
              // Only one card is needed to complete the flush.
              outCandidate.cardNeededCount = 1;
              // Record this candidate card.
              outCandidate.cardsThatCanMakeHand.push(candidate);
              // Record the held cards that make up the flush draw.
              outCandidate.cardsHeldForOut = suitCards.slice();
              outArray.push(outCandidate);
            }
          }
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
      // Look for a rank with at least three cards.
      let tripsRank: string | null = null;
      for (const r in freq) {
        if (freq[r] >= 3) {
          tripsRank = r;
          break;
        }
      }
      if (tripsRank) {
        // The held trip (or more) cards.
        const tripsCards = allCards.filter(card => card.value === tripsRank);
        // Consider each candidate rank (different from tripsRank).
        const otherRanks = Array.from(
          new Set(allCards.filter(card => card.value !== tripsRank).map(card => card.value))
        );
        for (const candidateRank of otherRanks) {
          // Determine how many candidate cards are already held.
          const candidateFreq = allCards.filter(card => card.value === candidateRank).length;
          // To form a pair you need two cards. 
          // If candidateFreq is 1, then only one card is needed.
          const needed = 2 - candidateFreq;
          // Only include candidate outs that require exactly one card to complete.
          if (needed !== 1) continue;
          // For each suit not already in play for candidateRank, create an Out.
          for (const suit of suits) {
            if (!allCards.some(card => card.value === candidateRank && card.suit === suit)) {
              const outCandidate = new Out();
              outCandidate.outHand = "Full House";
              outCandidate.possibleHand = true;
              outCandidate.cardNeededCount = needed; // will be 1.
              outCandidate.cardsThatCanMakeHand.push(new Card(candidateRank + suit));
              // Combine the held trip cards with any candidate cards already held.
              const candidateHeld = allCards.filter(card => card.value === candidateRank);
              outCandidate.cardsHeldForOut = tripsCards.concat(candidateHeld);
              outs.push(outCandidate);
            }
          }
        }
      }
      
      // Scenario 2: Two pair scenario.
      // Look for at least two ranks that appear exactly twice.
      const pairRanks = Object.keys(freq).filter(r => freq[r] === 2);
      if (pairRanks.length >= 2) {
        for (const pairRank of pairRanks) {
          const heldCards = allCards.filter(card => card.value === pairRank);
          // To upgrade the pair to trips, only one additional card is needed.
          for (const suit of suits) {
            if (!allCards.some(card => card.value === pairRank && card.suit === suit)) {
              const outCandidate = new Out();
              outCandidate.outHand = "Full House";
              outCandidate.possibleHand = true;
              outCandidate.cardNeededCount = 1;
              outCandidate.cardsThatCanMakeHand.push(new Card(pairRank + suit));
              outCandidate.cardsHeldForOut = heldCards;
              outs.push(outCandidate);
            }
          }
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
      // Get flush candidate outs (note: outsToFlush now returns an array of Out objects)
      const flushOuts: Out[] = HandEvaluator.outsToFlush(holeCards, communityCards);
      if (!flushOuts || flushOuts.length === 0) {
        // Without any flush draw, a straight flush cannot occur.
        return [];
      }
      // Assume the flush suit is defined by the first candidate from flushOuts.
      const flushSuit = flushOuts[0].cardsThatCanMakeHand[0].suit;
      
      // Evaluate candidate straight draws.
      const insideCandidates: Out[] = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
      const oesdCandidates: Out[] = HandEvaluator.outsToStraightOESD(holeCards, communityCards);
      // Combine all candidate straight draw outs.
      const allCandidates: Out[] = insideCandidates.concat(oesdCandidates);
      
      const straightFlushOuts: Out[] = [];
      // For each candidate whose candidate card is in the flush suit,
      // create a separate Out object for the straight flush draw.
      for (const candidate of allCandidates) {
        if (candidate.possibleHand && candidate.cardsThatCanMakeHand.length > 0) {
          const candidateCard = candidate.cardsThatCanMakeHand[0];
          if (candidateCard.suit === flushSuit) {
            const outCandidate = new Out();
            outCandidate.outHand = "Straight Flush";
            outCandidate.possibleHand = true;
            // Only one card is needed to complete the straight flush.
            outCandidate.cardNeededCount = 1;
            // Copy the held cards from the candidate straight draw.
            outCandidate.cardsHeldForOut = candidate.cardsHeldForOut.slice();
            // Use the candidate card as the card that completes the flush.
            outCandidate.cardsThatCanMakeHand.push(new Card(candidateCard.toString()));
            straightFlushOuts.push(outCandidate);
          }
        }
      }
      
      return straightFlushOuts;
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

/*
I'd like to convert this Swift function to TypeScript. The functions purpose is to evaluate a hand and return back the outs the hand can make for a three of a kind hand in Texas Hold'em Poker. It should only evaluate the hand with the assumption that the hand is not made already. 

The function should take two array's of Cards as inputs: holeCards and communityCards. The holeCards array will always have two cards and the communityCards array will have between 3 and 5 cards.

It should return an Out object as the result which is defined in the out.ts file. The resulting out object should indicate if the two pair is possible via the possibleHand boolean, indicate the hand type using the pokersolver.ts hand types as a string value, indicate the number of cards needed for the out in total (which is the number of cards that can make the out) and the specific cards that form the outs in the cardsNeeded array. The hand types are listed in the handValues array for the standard gameRules, and is listed below also.

If you see errors in the original Swift implementation you can adjust the function accordingly. Please use standard inputs of holeCards: Card[], communityCards: Card[]

Please also create a set of unit tests for this function. The unit tests should evaluate all conditions for a hand that can be evaluated for outs that make two pair. The unit tests should be written in the standard Chai + Mocha format.

          handValues: [
            StraightFlush,
            FourOfAKind,
            FullHouse,
            Flush,
            Straight,
            ThreeOfAKind,
            TwoPair,
            OnePair,
            HighCard,
          ],
*/

/*
Similar to the last change, can you update the outsToInsideStraightDraw() function? The logic is sounds, but I need to return a single out object for each possible out, even of the same type. For example, I'd like to return an Out that can make a pair from each of the hole cards, not a single out for both. Note it is possible depending on the hand for it to more than one out per hole card.

Also, can you adjust the cardsNeeded field on the Outs to be the number needed to form the hand, not the total outs possible. For example, holding a single card in the hole that makes a pair out would require just one card (not the three cards that are available to make the pair).

Finally, can you ensure the cardsHeldForOut field is populated with the cards that are held in the hand that are used to make the out.
*/