// Import the Hand class from your handsolver file as HandSolver.
import { Card, values } from './pokersolver';

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

/**
 * Represents the output of an outs calculation
 */
export class Out {
    possibleHand: boolean = false;
    outHand: string = "";
    cardNeededCount: number = 0;
    cardsNeeded: Card[] = [];
}  

export default class HandEvaluator {
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

    /**
     * Checks the outs for a pair from a high card hand. Checks only the highest card.
     * 
     * @param holeCards - An array of 2 cards that represent the player's hole cards
     * @param communityCards - An array of community cards (3-5)
     * @returns Out object containing information about outs to a pair
     */
    static outsToPair(holeCards: Card[], communityCards: Card[]): Out {
        const out: Out = new Out();
        out.possibleHand = false;
        out.outHand = "Pair";
        
        if (!holeCards || holeCards.length < 2) {
          throw new Error("Must provide two hole cards");
        }
        
        if (!communityCards || communityCards.length < 3) {
          throw new Error("Must provide at least three community cards");
        }
        
        // Combine hole cards and community cards
        const allCards = [...holeCards, ...communityCards];
        
        // Check if we already have a pair by looking at all cards
        const pairCheck = this.checkForPair(allCards);
        if (pairCheck) {
          // Already have a pair, no outs needed
          return out;
        }
        
        // We don't have a pair, so calculate outs for each hole card
        const suits = ['s', 'h', 'd', 'c'];
        out.possibleHand = true;
        
        // Process each hole card
        for (const holeCard of holeCards) {
          const cardValue = holeCard.value;
          const cardSuit = holeCard.suit;
          
          // Check which suits would make a pair
          for (const suit of suits) {
            // Skip if this is the card we already have
            if (suit === cardSuit) continue;
            
            // Skip if this card is already in play (either hole or community)
            const cardString = cardValue + suit;
            if (allCards.some(c => c.value + c.suit === cardString)) continue;
            
            // This is an out - add it to our list
            out.cardsNeeded.push(new Card(cardString));
            out.cardNeededCount++;
          }
        }
        
        return out;
      }
      
      // Helper method to check if there's a pair in a set of cards
      private static checkForPair(cards: Card[]): boolean {
        const ranks: Record<string, number> = {};
        
        for (const card of cards) {
          ranks[card.value] = (ranks[card.value] || 0) + 1;
          if (ranks[card.value] >= 2) {
            return true;
          }
        }
        
        return false;
      }
      
  /**
   * Evaluates the outs for making two pair.
   * The function takes two arrays of cards: the player's hole cards (2 cards) and the community cards (3–5 cards).
   * It assumes that the full hand (hole + community) is not already two pair (or better) and only evaluates a one-pair hand.
   *
   * The result Out object indicates:
   *  - possibleHand: whether the two pair is possible,
   *  - outHand: the expected hand type ("Two Pair"),
   *  - cardNeededCount: total number of cards that can complete the two pair,
   *  - cardsNeeded: the specific outs (as Card objects).
   *
   * @param holeCards - two Card objects representing the player's hole cards
   * @param communityCards - 3 to 5 Card objects representing the community cards
   * @returns Out object with the outs details.
   */
    static outsToTwoPair(holeCards: Card[], communityCards: Card[]): Out {
        const out = new Out();
        out.outHand = "Two Pair"; 
        out.possibleHand = false;

        if (!holeCards || holeCards.length !== 2) {
        throw new Error("Must provide exactly two hole cards");
        }
        if (!communityCards || communityCards.length < 3 || communityCards.length > 5) {
        throw new Error("Community cards must be between 3 and 5");
        }

        // Combine hole and community cards
        const allCards: Card[] = [...holeCards, ...communityCards];

        // Only evaluate if there is at least one pair in the full hand.
        if (!this.checkForPair(allCards)) {
        return out;
        }

        // Identify one pair – pick the first encountered pair by value.
        const rankCount: { [val: string]: number } = {};
        for (const card of allCards) {
        rankCount[card.value] = (rankCount[card.value] || 0) + 1;
        }
        let pairValue: string | null = null;
        for (const value in rankCount) {
        if (rankCount[value] >= 2) {
            pairValue = value;
            break;
        }
        }
        if (!pairValue) return out;

        // Create a sorted copy of the full hand (descending by rank)
        const sortedCards = allCards.slice().sort(Card.sort);
        // Select the highest card not in the pair.
        const nonPairCards = sortedCards.filter(card => card.value !== pairValue);
        if (nonPairCards.length === 0) return out;
        const highestCard = nonPairCards[0];

        // For that highest card, determine which suits are missing.
        // All four suits: s,h,d,c.
        const allSuits = ['s', 'h', 'd', 'c'];
        // Determine which suits for highestCard.value are already in play.
        const presentSuits = new Set(allCards.filter(card => card.value === highestCard.value).map(card => card.suit));
        const missingSuits = allSuits.filter(suit => !presentSuits.has(suit));

        if (missingSuits.length > 0) {
        out.possibleHand = true;
        out.cardNeededCount = missingSuits.length;
        for (const suit of missingSuits) {
            // Create a new Card from the highest card's value and the missing suit.
            out.cardsNeeded.push(new Card(highestCard.value + suit));
        }
        }
        return out;
    }

    /**
     * Checks for an inside straight draw (four cards that could make a straight with one card in the middle)
     * 
     * @param cards - Array of Card objects to check
     * @returns Out object containing information about the inside straight draw
     */
    static checkForInsideStraightDraw(cards: Card[]): Out {
        const out: Out = new Out();
        out.outHand = "Inside Straight Draw";
      
        if (!cards || cards.length < 4) {
          throw new Error("At least four cards are required to check for an inside straight draw");
        }
      
        // Use the imported values if available, otherwise fallback to a default array.
        const cardValues = (Array.isArray(values) && values.length > 0)
          ? values
          : ['1','2','3','4','5','6','7','8','9','T','J','Q','K','A'];
      
        // Sort cards by rank (using cardValues order)
        const sortedCards = [...cards].sort((a, b) => cardValues.indexOf(a.value) - cardValues.indexOf(b.value));
        // Extract unique ranks (as numeric indices)
        const rankValues = Array.from(new Set(sortedCards.map(card => cardValues.indexOf(card.value))));
      
        // If we have an Ace, handle it specially by treating Ace as low (represented by -1)
        if (rankValues.includes(cardValues.indexOf('A'))) {
          const aceLowRanks = [...rankValues.filter(r => r !== cardValues.indexOf('A')), -1].sort((a, b) => a - b);
      
          for (let i = 0; i <= aceLowRanks.length - 4; i++) {
            const subRanks = aceLowRanks.slice(i, i + 4);
            const min = Math.min(...subRanks);
            const max = Math.max(...subRanks);
      
            // Standard inside straight draw check
            if (max - min === 4 && subRanks.length === 4) {
              out.possibleHand = true;
              out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
              out.cardNeededCount = out.cardsNeeded.length;
              return out;
            }
      
            // Special check when Ace is low: if -1 is present and we have 0, 1, and 2 in the sequence,
            // then the missing needed card would complete the series.
            if (min === -1 && subRanks.includes(0) && subRanks.includes(1) && subRanks.includes(2)) {
              out.possibleHand = true;
              out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
              out.cardNeededCount = out.cardsNeeded.length;
              return out;
            }
      
            // Optional: if the sequence starts from 0 and ends at 3 (i.e. 0,1,2,3) it’s another valid configuration.
            if (min === 0 && max === 3 && subRanks.length === 4) {
              out.possibleHand = true;
              out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
              out.cardNeededCount = out.cardsNeeded.length;
              return out;
            }
          }
        }
      
        // Process non-Ace-low sequences. Iterate through unique rankValues in order.
        for (let i = 0; i <= rankValues.length - 4; i++) {
          const subRanks = rankValues.slice(i, i + 4);
          const min = Math.min(...subRanks);
          const max = Math.max(...subRanks);
      
          if (max - min === 4 && subRanks.length === 4) {
            out.possibleHand = true;
            out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
            out.cardNeededCount = out.cardsNeeded.length;
            return out;
          }
        }
      
        return out;
      }

    // Helper method to find missing cards for an inside straight draw
    private static findMissingCards(subRanks: number[], sortedCards: Card[]): Card[] {
        const missingCards: Card[] = [];
        const suits = ['s', 'h', 'd', 'c'];
        
        // Create a set of cards that are already in play (as strings for easy comparison)
        const existingCards = new Set(sortedCards.map(card => card.value + card.suit));
        
        // Use the imported values if available, otherwise fallback to a default array.
        const cardValues = (Array.isArray(values) && values.length > 0)
        ? values
        : ['1','2','3','4','5','6','7','8','9','T','J','Q','K','A'];
        
        // Iterate through the range of ranks in the subRanks sequence
        for (let rank = Math.min(...subRanks); rank <= Math.max(...subRanks); rank++) {
            if (!subRanks.includes(rank)) {
                // Missing rank found in the sequence; determine its card value.
                // Here, if rank === -1 we treat it as Ace (for Ace-low straight)
                const cardVal = (rank === -1) ? 'A' : cardValues[rank];
                
                // For each suit, if that card is not already in play, add it as a missing card.
                for (const suit of suits) {
                const cardString = cardVal + suit;
                if (!existingCards.has(cardString)) {
                    missingCards.push(new Card(cardString));
                }
                }
            }
        }
        
        return missingCards;
    }
}

/*
I'd like to convert this Swift function to TypeScript. The functions purpose is to evaluate a hand and retrun back the outs the hand can make two pair. It should only evaluate the hand for two pairs with the assumption that the hand is not a two pair already. These hands are Texas Hold'em poker hands. 

The function should take two array's of Cards as inputs: holeCards and communityCards. The holeCards array will always have two cards and the communityCards array will have between 3 and 5 cards.

It should return a n Out object as the result which is defined in the out.ts file. The resulting out object should indicate if the two pair is possible via the possibleHand boolean, indicate the hand type using the pokersolver.ts hand types as a string value, indicate the number of cards needed for the out in total (which is the number of cards that can make the out) and the specific cards that form the outs in the cardsNeeded array. The hand types are listed in the handValues array for the standard gameRules, and is listed below also.

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