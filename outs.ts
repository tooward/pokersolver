// Import the Hand class from your handsolver file as HandSolver.
import { Card, Hand, Game  } from 'tooward-pokersolver'

// Define card values in ascending order (same as in pokersolver)
const values = {
    '2': 0,
    '3': 1,
    '4': 2,
    '5': 3,
    '6': 4,
    '7': 5,
    '8': 6,
    '9': 7,
    'T': 8,
    'J': 9,
    'Q': 10,
    'K': 11,
    'A': 12
  };

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

        // Sort cards by rank
        const sortedCards = [...cards].sort((a, b) => values[a.value] - values[b.value]);

        // Extract unique ranks
        const rankValues = Array.from(new Set(sortedCards.map(card => values[card.value])));

        // If we have an Ace, handle it specially
        if (rankValues.includes(values['A'])) {
            const aceLowRanks = [...rankValues.filter(r => r !== values['A']), -1].sort((a, b) => a - b);

            for (let i = 0; i <= aceLowRanks.length - 4; i++) {
                const subRanks = aceLowRanks.slice(i, i + 4);
                const min = Math.min(...subRanks);
                const max = Math.max(...subRanks);

                if (max - min === 4 && subRanks.length === 4) {
                    out.possibleHand = true;
                    out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
                    out.cardNeededCount = out.cardsNeeded.length;
                    return out;
                }

                if (min === -1 && subRanks.includes(0) && subRanks.includes(1) && subRanks.includes(2)) {
                    out.possibleHand = true;
                    out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
                    out.cardNeededCount = out.cardsNeeded.length;
                    return out;
                }

                if (min === 0 && max === 3 && subRanks.length === 4) {
                    out.possibleHand = true;
                    out.cardsNeeded = this.findMissingCards(subRanks, sortedCards);
                    out.cardNeededCount = out.cardsNeeded.length;
                    return out;
                }
            }
        }

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

        for (let rank = Math.min(...subRanks); rank <= Math.max(...subRanks); rank++) {
            if (!subRanks.includes(rank)) {
                // Found a missing rank in the sequence
                for (const suit of suits) {
                    // Find the card value string for this rank
                    const cardValue = Object.keys(values).find(key => values[key] === rank) || 
                                    (rank === -1 ? 'A' : rank.toString()); // Handle special case for Ace-low
                    
                    // Create card string for checking if it exists
                    const cardString = cardValue + suit;
                    
                    // Only add if card is not already in play
                    if (cardValue && !existingCards.has(cardString)) {
                        missingCards.push(new Card(cardString));
                    }
                }
            }
        }

        return missingCards;
    }
}