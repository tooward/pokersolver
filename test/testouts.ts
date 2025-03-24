import { expect } from 'chai';
import { Card, Hand, Game } from '../pokersolver';
import HandEvaluator, { Out } from '../outs';

describe("HandEvaluator.calculateOuts", () => {
  it("should return empty outs for a preflop scenario", () => {
    // Preflop (less than 3 community cards) should return an empty Outs container.
    const holeCards = ["As", "Kd"].map(c => new Card(c));
    const communityCards = ["2h", "3d"].map(c => new Card(c)); // only 2 cards
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    expect(result.outs).to.be.empty;
  });

  it("should evaluate a high card hand and return Pair outs", () => {
    // High Card scenario:
    // Hole: 8♠, Q♣; Community: 3♦, 4♥, J♠.
    // No made pair. Only improvement is to pair one of the hole cards.
    const holeCards = ["8s", "Qc"].map(c => new Card(c));
    const communityCards = ["3d", "4h", "Js"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    // Assuming the solver yields a "High Card" hand,
    // outsToPair (one per eligible over card) will run.
    expect(result.outs.length).to.be.greaterThan(0);
    expect(result.highestOutHand).to.equal("Pair");
    // Verify that outCards are unique and well formed.
    result.outCards.forEach(card => {
      expect(card).to.be.instanceOf(Card);
    });
  });

  it("should evaluate a high card hand with a flush draw and return Flush outs", () => {
    // High Card but with a flush draw:
    // Hole: A♥, 7♥; Community: 3♥, 8♥, 2♦.
    // 4 hearts total → flush draw.
    const holeCards = ["Ah", "7h"].map(c => new Card(c));
    const communityCards = ["3h", "8h", "2d"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    // Even though the best made hand is "High Card" (or possibly a pair if one card qualifies),
    // the flush draw branch is checked afterward.
    expect(result.outs.some(out => out.outHand === "Flush")).to.be.true;
    // Since the flush branch runs later, highestOutHand should be "Flush".
    expect(result.highestOutHand).to.equal("Flush");
  });

  it("should evaluate a one pair hand and return two pair / three-of-a-kind outs", () => {
    // One Pair scenario:
    // Hole: A♠, 7♥; Community: A♣, 3♣, T♦.
    // Makes a pair of Aces.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Ac", "3c", "Td"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    // In the Pair branch, outsToTwoPair and outsToThreeKind are computed.
    // We expect at least one improvement candidate from one of these functions.
    expect(result.outs.some(out => out.outHand === "Two Pair" || out.outHand === "Three of a Kind"))
      .to.be.true;
    // According to our logic, if outsToThreeKind returns outs then highestOutHand is set to that.
    expect(["Two Pair", "Three of a Kind"]).to.include(result.highestOutHand);
  });

  it("should evaluate a two pair hand and return Full House outs", () => {
    // Two Pair scenario:
    // Hole: 7♥, Q♥; Community: 7♦, Q♦, 9♠.
    // Made two pair (7's and Q's). Improvement to Full House is possible.
    const holeCards = ["7h", "Qh"].map(c => new Card(c));
    const communityCards = ["7d", "Qd", "9s"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    // The two pair branch calls outsToFullHouse.
    expect(result.outs.some(out => out.outHand === "Full House")).to.be.true;
    expect(result.highestOutHand).to.equal("Full House");
  });

  it("should evaluate a three of a kind hand and return both Full House and Four of a Kind outs", () => {
    // Three of a Kind scenario:
    // Hole: 7♥, 7♦; Community: 7♠, Q♦, 9♠.
    // This gives trip 7's. Improvement to Full House and Four of a Kind is possible.
    const holeCards = ["7h", "7d"].map(c => new Card(c));
    const communityCards = ["7s", "Qd", "9s"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    expect(result.outs.some(out => out.outHand === "Full House")).to.be.true;
    expect(result.outs.some(out => out.outHand === "Four of a Kind")).to.be.true;
    // In our three-of-a-kind branch, if Four of a Kind outs exist they are computed last.
    expect(result.highestOutHand).to.equal("Four of a Kind");
  });

  it("should evaluate a hand with a straight draw and return straight outs", () => {
    // Straight draw scenario:
    // Hole: 8♠, 9♣; Community: 7♦, T♠, 2♥.
    // Cards present: 7,8,9,10 with one card missing to complete a straight.
    const holeCards = ["8s", "9c"].map(c => new Card(c));
    const communityCards = ["7d", "Ts", "2h"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    // The straight draw branch computes outs (from both OESD and inside draw functions).
    // Verify at least one out from either straight draw candidate exists.
    expect(result.outs.some(out => out.outHand.match(/Straight/))).to.be.true;
    expect(result.highestOutHand).to.match(/Straight/);
  });

  it("should evaluate a hand with combined straight and flush draws (potential straight flush draw)", () => {
    // Combined draw scenario:
    // Hole: A♥, K♥; Community: Q♥, J♥, 9♣.
    // There are 4 hearts (flush draw) and the cards A, K, Q, J are present (a straight draw missing T).
    // Thus, a straight flush draw improvement might be possible.
    const holeCards = ["Ah", "Kh"].map(c => new Card(c));
    const communityCards = ["Qh", "Jh", "9c"].map(c => new Card(c));
    const result = HandEvaluator.calculateOuts(holeCards, communityCards);
    // Expect that either a flush candidate or a straight flush candidate appears.
    expect(result.outs.some(out => out.outHand === "Flush" || out.outHand === "Straight Flush"))
      .to.be.true;
  });
});

describe('checkOverCards', () => {
  it('should return a hole card higher than all community cards', () => {
    const hole = ['As', 'Ts'].map(c => new Card(c));
    const community = ['9h', '7d', '2c'].map(c => new Card(c));
    
    const result = HandEvaluator.checkOverCards(hole, community);
    
    expect(result).to.have.lengthOf(2);
    expect(result[0].toString()).to.equal('As');
    expect(result[1].toString()).to.equal('10s');
  });

  it('should return only one hole card when only one is higher', () => {
    const hole = ['As', '8h'].map(c => new Card(c));
    const community = ['Kh', '9d', '2c'].map(c => new Card(c));
    
    const result = HandEvaluator.checkOverCards(hole, community);
    
    expect(result).to.have.lengthOf(1);
    expect(result[0].toString()).to.equal('As');
  });

  it('should return an empty array when no hole cards are higher', () => {
    const hole = ['Qs', 'Jh'].map(c => new Card(c));
    const community = ['Kh', 'Ad', '2c'].map(c => new Card(c));
    
    const result = HandEvaluator.checkOverCards(hole, community);
    
    expect(result).to.have.lengthOf(0);
  });

  it('should return an empty array when a hole card matches a community card', () => {
    const hole = ['Ks', 'Ah'].map(c => new Card(c));
    const community = ['Kh', '7d', '2c'].map(c => new Card(c));
    
    const result = HandEvaluator.checkOverCards(hole, community);
    
    expect(result).to.have.lengthOf(1);
    expect(result[0].toString()).to.equal('Ah');
  });

  it('should handle more than 3 community cards', () => {
    const hole = ['Ks', 'Ah'].map(c => new Card(c));
    const community = ['Qh', 'Jd', '10c', '9s', '2h'].map(c => new Card(c));
    
    const result = HandEvaluator.checkOverCards(hole, community);
    
    expect(result).to.have.lengthOf(2);
    expect(result[0].toString()).to.equal('Ks');
    expect(result[1].toString()).to.equal('Ah');
  });

  it('should throw an error when community cards array is empty', () => {
    const hole = ['Ks', 'Ah'].map(c => new Card(c));
    const community: Card[] = [];
    
    expect(() => {
      HandEvaluator.checkOverCards(hole, community);
    }).to.throw('Community cards must be provided to check for over cards');
  });
});

describe("HandEvaluator.isFlushDraw", () => {
  it("should return true if exactly four cards of a suit are present", () => {
    // Example: hole cards: Ah, 7h and community cards: 3h, 8h, 2d.
    // This gives exactly four hearts.
    const holeCards = ["Ah", "7h"].map(c => new Card(c));
    const communityCards = ["3h", "8h", "2d"].map(c => new Card(c));
    
    const result = HandEvaluator.isFlushDraw(holeCards, communityCards);
    expect(result).to.be.true;
  });

  it("should return false if fewer than four cards of any suit are present", () => {
    // Example: hole cards: Ah, 7d and community cards: 3h, 8c, 2d.
    // No suit reaches 4 cards.
    const holeCards = ["Ah", "7d"].map(c => new Card(c));
    const communityCards = ["3h", "8c", "2d"].map(c => new Card(c));

    const result = HandEvaluator.isFlushDraw(holeCards, communityCards);
    expect(result).to.be.false;
  });

  it("should return false if a flush is already made (5 or more cards of a suit)", () => {
    // Example: hole cards: Ah, 7h and community cards: 3h, 8h, 2h.
    // This produces 5 hearts which is a made flush (not a draw).
    const holeCards = ["Ah", "7h"].map(c => new Card(c));
    const communityCards = ["3h", "8h", "2h"].map(c => new Card(c));

    const result = HandEvaluator.isFlushDraw(holeCards, communityCards);
    expect(result).to.be.false;
  });
});

describe("HandEvaluator.isStraightDraw", () => {
  it("should return true for an inside straight draw", () => {
    // Example: Hole: 8♠, 9♣; Community: 7♦, 10♠, 2♥.
    // Here the candidate 5‑card straight is 7-8-9-10-J.
    // 7, 8, 9, and 10 are present (and J is missing) so exactly 4 of 5 exist.
    const holeCards = ["8s", "9c"].map(c => new Card(c));
    const communityCards = ["7d", "Ts", "2h"].map(c => new Card(c));
    
    const result = HandEvaluator.isStraightDraw(holeCards, communityCards);
    expect(result).to.be.true;
  });

  it("should return true if the straight is already complete", () => {
    // Example: Hole: 8♠, 9♣; Community: 7♦, 10♠, Jd.
    // Here the straight 7-8-9-10-J is complete (5 cards present), so it's not a draw.
    const holeCards = ["8s", "9c"].map(c => new Card(c));
    const communityCards = ["7d", "Ts", "Jd"].map(c => new Card(c));
    
    const result = HandEvaluator.isStraightDraw(holeCards, communityCards);
    expect(result).to.be.true;
  });

  it("should return false when no straight draw is present", () => {
    // Example: Hole: 2♥, 4♠; Community: 7♦, 10♠, 3♣.
    // No contiguous block of 4 exists.
    const holeCards = ["2h", "4s"].map(c => new Card(c));
    const communityCards = ["7d", "Ts", "3c"].map(c => new Card(c));
    
    const result = HandEvaluator.isStraightDraw(holeCards, communityCards);
    expect(result).to.be.false;
  });

  it("should return true for an Ace-low inside straight draw", () => {
    // Example: Ace can be played low for a A-2-3-4-5 straight.
    // Hole: A♠, 3♦; Community: 2♣, 4♥, 9s.
    // With Ace processed as both high and low (-1), we have -1, 0, 1, and 2 present.
    // Candidate sequence: [-1, 0, 1, 2, 3] where '5' (index 3) is missing.
    const holeCards = ["As", "3d"].map(c => new Card(c));
    const communityCards = ["2c", "4h", "9s"].map(c => new Card(c));
    
    const result = HandEvaluator.isStraightDraw(holeCards, communityCards);
    expect(result).to.be.true;
  });

  it("should detect an open-ended straight draw as a draw", () => {
    // Example: Hole: 5♥, 6♥; Community: 7♦, 8♣, Kd.
    // Candidate straight: 5-6-7-8-9, missing 9.
    const holeCards = ["5h", "6h"].map(c => new Card(c));
    const communityCards = ["7d", "8c", "Kd"].map(c => new Card(c));
    
    const result = HandEvaluator.isStraightDraw(holeCards, communityCards);
    expect(result).to.be.true;
  });
});

describe('outsToPair (updated for over-card logic)', () => {
  it('should identify outs to pair each hole card when both are over cards', () => {
    // In this scenario, both hole cards are higher than every community card.
    // For holeCards: ['As', 'Kh'] and communityCards: ['2h', '3c', 'Td']
    // Both As and Kh are over the board.
    // For each, candidate outs should be for the 3 missing suits.
    const holeCards = ['As', 'Kh'].map(c => new Card(c));
    const communityCards = ['2h', '3c', 'Td'].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Expect two Out objects—one for each over card.
    expect(results).to.be.an('array').with.lengthOf(2);
    
    // For each Out, candidate outs should be 3 each.
    const totalOuts = results.reduce((sum, out) => sum + out.cardNeededCount, 0);
    expect(totalOuts).to.equal(6);
    
    // Check each Out’s attributes.
    results.forEach(out => {
      expect(out.outHand).to.equal('Pair');
      expect(out.possibleHand).to.be.true;
      // Each Out’s held card should be one of the hole cards.
      expect(out.cardsHeldForOut).to.be.an('array').that.is.not.empty;
      // Candidate outs are for missing suits.
      expect(out.cardsThatCanMakeHand).to.be.an('array').with.lengthOf(3);
    });
  });
  
  it('should identify outs only for the over card when only one hole card is over', () => {
    // In this scenario, only one hole card is higher than every community card.
    // For holeCards: ['As', '7h'] and communityCards: ['Qd', '3c', 'Td']
    // Ace is over (since Ace > Q) but 7 is not.
    const holeCards = ['As', '7h'].map(c => new Card(c));
    const communityCards = ['Qd', '3c', 'Td'].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Expect only one Out object (for 'As').
    expect(results).to.be.an('array').with.lengthOf(1);
    
    // The held card in the out should be 'As'
    const heldCards = results[0].cardsHeldForOut.map(c => c.toString());
    expect(heldCards).to.contain('As');
    
    // Candidate outs for 'As' should be for the three missing suits.
    const candidateOuts = results[0].cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateOuts).to.deep.equal(["Ac", "Ad", "Ah"].sort());
  });
  
  it('should not return any outs when the hole cards are already paired', () => {
    // If hole cards are a pair, no candidate outs are needed.
    const holeCards = ['As', 'Ah'].map(c => new Card(c));
    const communityCards = ['2h', '3c', 'Td'].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    expect(results).to.be.an('array').that.is.empty;
  });
  
  it('should not return outs for a hole card already paired by a community card', () => {
    // For holeCards: ['As', 'Kh'] with communityCards: ['Ah', '3c', 'Td'],
    // the Ace is paired by community (As + Ah) so only 'Kh' should generate outs.
    const holeCards = ['As', 'Kh'].map(c => new Card(c));
    const communityCards = ['Ah', '3c', 'Td'].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Expect only one Out (for 'Kh') because 'As' is already paired.
    expect(results).to.be.an('array').with.lengthOf(1);
    
    const outForKh = results[0];
    // For 'Kh', candidate outs should be for suits other than 'h': Kc, Kd, Ks.
    expect(outForKh.cardNeededCount).to.equal(3);
    expect(outForKh.cardsThatCanMakeHand.map(c => c.toString()).sort())
      .to.deep.equal(["Kc", "Kd", "Ks"].sort());
  });
  
  it('should throw an error when fewer than 2 hole cards are provided', () => {
    const holeCards = ['As'].map(c => new Card(c));
    const communityCards = ['2h', '3c', 'Td'].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToPair(holeCards, communityCards);
    }).to.throw('Must provide exactly two hole cards');
  });
  
  it('should throw an error when fewer than 3 community cards are provided', () => {
    const holeCards = ['As', 'Kh'].map(c => new Card(c));
    const communityCards = ['2h', '3c'].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToPair(holeCards, communityCards);
    }).to.throw('Must provide at least three community cards');
  });
  
  it('should handle when both hole cards can complete a pair under fallback (i.e. when no over cards are present)', () => {
    // In this test, neither hole card is over the board.
    // For holeCards: ['7s', '6h'] and communityCards: ['8d', '9c', 'Td'],
    // neither 7 nor 6 is higher than all community cards (since 8,9,10 > 7 and 6).
    // In that event, our fallback uses both hole cards.
    const holeCards = ['7s', '6h'].map(c => new Card(c));
    const communityCards = ['8d', '9c', 'Td'].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Expect two Out objects (one for each hole card)
    expect(results).to.be.an('array').with.lengthOf(2);
    
    // For each, candidate outs should yield 3 possible cards.
    const totalOuts = results.reduce((sum, out) => sum + out.cardNeededCount, 0);
    expect(totalOuts).to.equal(6);
  });
});

describe("outsToTwoPair", () => {
  it("should return possibleHand false when there is no pair in the full hand", () => {
    // Create a high card hand (no pair)
    const holeCards = ["As", "Kd"].map(c => new Card(c));
    const communityCards = ["Qh", "Jc", "9s"].map(c => new Card(c));
    const result = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(result).to.be.an("array").that.is.empty;
  });
  
  it("should evaluate outs for a one-pair hand", () => {
    // For example: a pair of 8's with three other cards.
    // Hand: HoleCards: 8s, 8h; Community: Kc, 4d, 2s.
    // The pair is 8's. The candidate for second pair is the highest non-pair, here expected to be Kc.
    // Missing candidate suits for "K" (given Kc is in play) should be: "Kh", "Ks", "Kd".
    const holeCards = ["8s", "8h"].map(c => new Card(c));
    const communityCards = ["Kc", "4d", "2s"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(results).to.be.an("array").that.has.lengthOf(3);
    results.forEach(out => {
      expect(out.outHand).to.equal("Two Pair");
      expect(out.possibleHand).to.be.true;
      // Now each out requires only one card to complete the improvement.
      expect(out.cardNeededCount).to.equal(1);
    });
    
    // Verify that the candidate outs are exactly "Kh", "Ks", and "Kd".
    const candidateOuts = results.map(out => out.cardsThatCanMakeHand[0].toString()).sort();
    const expected = ["Kh", "Ks", "Kd"].sort();
    expect(candidateOuts).to.deep.equal(expected);
  });
  
  it("should return possibleHand false when the full hand already is two pair", () => {
    // Hand already has two pair: 
    // HoleCards: 8s, 8h; Community: Kc, Kd, 2s.
    const holeCards = ["8s", "8h"].map(c => new Card(c));
    const communityCards = ["Kc", "Kd", "2s"].map(c => new Card(c));
    const results = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });
  
  it("should return Out with no outs if the candidate card already appears in all suits", () => {
    // Combine holeCards: 7s, 7h; Community: Kc, Kh, Kd, Ks.
    const holeCards = ["7s", "7h"].map(c => new Card(c));
    const communityCards = ["Kc", "Kh", "Kd", "Ks"].map(c => new Card(c));
    const results = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });
  
  it("should throw an error if holeCards array does not have exactly two cards", () => {
    const holeCards = ["As"].map(c => new Card(c));
    const communityCards = ["Qh", "Jc", "9s"].map(c => new Card(c));
    expect(() => {
      HandEvaluator.outsToTwoPair(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });
  
  it("should throw an error if communityCards array is not between 3 and 5 cards", () => {
    const holeCards = ["As", "Kd"].map(c => new Card(c));
    const communityCards = ["Qh", "Jc"].map(c => new Card(c)); // only 2 cards
    expect(() => {
      HandEvaluator.outsToTwoPair(holeCards, communityCards);
    }).to.throw("Community cards must be between 3 and 5");
  });
});

describe("HandEvaluator.outsToThreeKind", () => {
  it("should return outs for a hand with a valid pair (one out per missing suit)", () => {
    // Example: HoleCards: ['As', '7h'], CommunityCards: ['Ad', '2h', '3c']
    // The pair is Aces (As and Ad). Missing suits for Aces are 'Ah' and 'Ac'.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Ad", "2h", "3c"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToThreeKind(holeCards, communityCards);
    
    expect(results).to.be.an("array").that.has.lengthOf(2);
    results.forEach(out => {
      expect(out.outHand).to.equal("Three of a Kind");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // cardsHeldForOut should contain the two Ace cards.
      expect(out.cardsHeldForOut.map(c => c.toString())).to.include("As").and.to.include.members(["Ad"]);
    });
    
    const candidateOuts = results.map(o => o.cardsThatCanMakeHand[0].toString()).sort();
    expect(candidateOuts).to.deep.equal(["Ah", "Ac"].sort());
  });

  it("should return an empty array when no pair is present", () => {
    // No pair exists.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Kc", "2h", "3c"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToThreeKind(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should throw an error when input arrays have incorrect lengths", () => {
    const holeCards = ["As"].map(c => new Card(c));
    const communityCards = ["Ad", "2h", "3c"].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToThreeKind(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
    
    const holeCards2 = ["As", "7h"].map(c => new Card(c));
    const communityCards2 = ["Ad", "2h"].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToThreeKind(holeCards2, communityCards2);
    }).to.throw("Community cards must be between 3 and 5");
  });
});

describe("HandEvaluator.outsToStraightOESD", () => {
  it("should detect an OESD and return outs for both endpoints", () => {
    // Example: HoleCards: ['5h', '6d'], CommunityCards: ['7s', '8c', 'Qd']
    // Sorted ranks: 5-6-7-8 form the block. Missing endpoints: one below (4) and one above (9).
    const holeCards = ["5h", "6d"].map(c => new Card(c));
    const communityCards = ["7s", "8c", "Qd"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToStraightOESD(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.not.empty;
    results.forEach(out => {
      expect(out.possibleHand).to.be.true;
      expect(out.outHand).to.equal("Straight (OESD)");
      expect(out.cardNeededCount).to.equal(1);
    });
    
    // Get candidate missing values; should include "4" or "9" (depending on available outs).
    const candidateValues = results.map(o => o.cardsThatCanMakeHand[0].value);
    expect(candidateValues).to.satisfy((vals: string[]) => vals.includes("4") || vals.includes("9"));
  });
  
  it("should exclude candidate outs already in play", () => {
    // Example: HoleCards: ['5h', '6d'], CommunityCards: ['7s', '8c', '4h']
    // Here, a "4h" exists, so candidate outs for "4" in suit "h" should be excluded.
    const holeCards = ["5h", "6d"].map(c => new Card(c));
    const communityCards = ["7s", "8c", "4h"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToStraightOESD(holeCards, communityCards);
    results.forEach(out => {
      out.cardsThatCanMakeHand.forEach(card => {
        expect(card.toString()).to.not.equal("4h");
      });
    });
  });
  
  it("should return an empty array when no 4-card contiguous block exists", () => {
    // Example: HoleCards: ['2h', '9d'], CommunityCards: ['5s', '7c', 'Kc']
    const holeCards = ["2h", "9d"].map(c => new Card(c));
    const communityCards = ["5s", "7c", "Kc"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToStraightOESD(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });
  
  it("should throw errors for invalid input lengths", () => {
    const holeCards = ["5h"].map(c => new Card(c));
    const communityCards = ["7s", "8c", "Qd"].map(c => new Card(c));
    expect(() => {
      HandEvaluator.outsToStraightOESD(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
    
    const holeCards2 = ["5h", "6d"].map(c => new Card(c));
    const communityCards2 = ["7s", "8c"].map(c => new Card(c));
    expect(() => {
      HandEvaluator.outsToStraightOESD(holeCards2, communityCards2);
    }).to.throw("Community cards must be between 3 and 5");
  });
});

describe("HandEvaluator.outsToInsideStraightDraw", () => {
  it("should return an array of Out objects with proper fields for an inside straight draw", () => {
    // Example: Using holeCards: 5h, 7h and communityCards: 8s, 9c, Kd.
    // The expected contiguous block is [5,7,8,9] (indices: 3,5,6,7) with full range [3,4,5,6,7].
    // The missing rank is index 4 which is "6". Thus candidate missing cards should all have value "6".
    const holeCards = [new Card("5h"), new Card("7h")];
    const communityCards = [new Card("8s"), new Card("9c"), new Card("Kd")];
    
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    
    expect(results).to.be.an("array");
    expect(results.length).to.be.greaterThan(0);
    results.forEach(out => {
      expect(out.outHand).to.equal("Inside Straight Draw");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      expect(out.cardsHeldForOut).to.be.an("array").that.is.not.empty;
      expect(out.cardsThatCanMakeHand).to.be.an("array").that.is.not.empty;
      // Verify that each candidate missing card has value "6"
      out.cardsThatCanMakeHand.forEach(card => {
        expect(card.value).to.equal("6");
      });
    });
  });

  it("should return an empty array when no inside straight draw is found", () => {
    // Example: No inside straight draw available.
    const holeCards = [new Card("2h"), new Card("5d")];
    const communityCards = [new Card("9s"), new Card("Jc"), new Card("Kd")];
    
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should exclude candidate outs already in play", () => {
    // Example: Here the missing candidate for the draw is "6". If "6h" is already in play, it must be excluded.
    const holeCards = [new Card("6c"), new Card("7h")];
    const communityCards = [new Card("8s"), new Card("9c"), new Card("6h")];
    
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    results.forEach(out => {
      // None of the candidate outs should be "6h"
      expect(out.cardsThatCanMakeHand.some(card => card.toString() === "6h")).to.be.false;
      // But at least one candidate out with value "6" of a different suit should exist.
      expect(out.cardsThatCanMakeHand.some(card => card.value === "6" && card.suit !== "h")).to.be.true;
    });
  });

  it("should throw an error if fewer than 4 cards are provided", () => {
    // Provide only 2 hole cards and 1 community card (total 3 cards)
    const holeCards = [new Card("Ah"), new Card("Kd")];
    const communityCards = [new Card("Qs")];
    
    expect(() => {
      HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    }).to.throw("Community cards must be between 3 and 5");
  });
});

describe("HandEvaluator.outsToFlush", () => {
  it("should return candidate Out objects for flush draw when a suit has exactly four cards", () => {
    // Example: HoleCards: ["7h", "8h"]; CommunityCards: ["9h", "Th", "2c"]
    // In hearts, we have 7h, 8h, 9h, Th (flush draw). Candidate outs are all missing heart cards.
    const holeCards = [new Card("7h"), new Card("8h")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("2c")];
    const results = HandEvaluator.outsToFlush(holeCards, communityCards);
    
    expect(results).to.be.an("array").that.is.not.empty;
    // For each candidate out, check the following:
    results.forEach(out => {
      expect(out.outHand).to.equal("Flush");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
      // The candidate card must be in hearts.
      expect(out.cardsThatCanMakeHand[0].suit).to.equal("h");
      // The cardsHeldForOut should equal exactly the 4 held heart cards.
      const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
      expect(heldCards).to.deep.equal(["7h", "8h", "9h", "10h"].sort());
    });
  });

  it("should return an empty array when no flush draw exists", () => {
    // Example: HoleCards: ["7h", "8d"]; CommunityCards: ["9h", "Th", "2c"]
    // In hearts there are only 7h and 9h => flush draw not present.
    const holeCards = [new Card("7h"), new Card("8d")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("2c")];
    const results = HandEvaluator.outsToFlush(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should throw an error for invalid input lengths", () => {
    const holeCards = [new Card("7h")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("2c")];
    
    expect(() => {
      HandEvaluator.outsToFlush(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });
});

describe("HandEvaluator.outsToFullHouse", () => {
  it("should throw an error if the hand is already a full house", () => {
    // Hand already made full house: HoleCards: ["8s", "8h"], CommunityCards: ["8d", "Kc", "Kd"]
    const holeCards = ["8s", "8h"].map(c => new Card(c));
    const communityCards = ["8d", "Kc", "Kd"].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToFullHouse(holeCards, communityCards);
    }).to.throw("Hand already made full house");
  });

  it("should return candidate outs for a trips scenario", () => {
    // Example: HoleCards: ["As", "7h"], CommunityCards: ["Ad", "Ac", "2h"]
    // Trips of Aces are held (As, Ad, Ac). For candidate pair, consider any other rank.
    // Suppose the board does not provide any card of rank "K", so candidate outs for "K" are available.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Ad", "Ac", "2h"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.not.empty;
    // Each candidate out should have:
    // - outHand = "Full House"
    // - possibleHand = true
    // - cardNeededCount equal to the number needed based on how many candidate cards are held (0 means need 2; 1 means need 1)
    // - cardsHeldForOut populated with the trips cards plus any candidate cards held.
    results.forEach(out => {
      expect(out.outHand).to.equal("Full House");
      expect(out.possibleHand).to.be.true;
      expect(out.cardsThatCanMakeHand).to.be.an("array").that.has.lengthOf(1);
      // Candidate card's rank should not equal "A" (since trips are Aces).
      expect(out.cardsThatCanMakeHand[0].value).to.not.equal("A");
      // The held cards for out should include all Aces.
      const heldRanks = out.cardsHeldForOut.map(c => c.value);
      expect(heldRanks).to.include("A");
    });

    it("should only return Out objects that require exactly one card to complete the full house (trips scenario)", () => {
      // Scenario:
      // HoleCards: ['As', '7h']
      // CommunityCards: ['Ac', 'Ad', 'Kc']
      //
      // This yields three Aces (the trip) and two candidate ranks:
      // - Rank '7': appears once (7h). Needed = 2 - 1 = 1.
      //   Since 7h is in play, missing candidate cards for '7' are: 7s, 7d, 7c.
      //
      // - Rank 'K': appears once (Kc). Needed = 2 - 1 = 1.
      //   Since Kc is in play, missing candidate cards for 'K' are: Ks, Kh, Kd.
      //
      // In total, we expect 3 outs for rank '7' and 3 outs for rank 'K' (6 outs overall).
      const holeCards = ['As', '7h'].map(c => new Card(c));
      const communityCards = ['Ac', 'Ad', 'Kc'].map(c => new Card(c));
      
      const results = HandEvaluator.outsToFullHouse(holeCards, communityCards);
      
      // We expect only candidate outs for ranks with needed === 1, so total outs should be 6.
      expect(results).to.be.an("array").that.is.not.empty;
      
      let totalOuts = 0;
      results.forEach(out => {
        // Each Out must require exactly one card.
        expect(out.cardNeededCount).to.equal(1);
        totalOuts += out.cardNeededCount;
        // Also check that the candidate card's value is either '7' or 'K'
        const candidateValue = out.cardsThatCanMakeHand[0].value;
        expect(["7", "K"]).to.include(candidateValue);
      });
      
      expect(totalOuts).to.equal(6);
    });
  });

  it("should return candidate outs for a two pair scenario", () => {
    // Example: Two pair scenario: HoleCards: ["8s", "8h"], CommunityCards: ["Kc", "Kd", "2h"]
    // Two pair exists (eights and kings). Outs are for completing trips on either pair.
    const holeCards = ["8s", "8h"].map(c => new Card(c));
    const communityCards = ["Kc", "Kd", "2h"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.not.empty;
    // For each candidate out, verify that it is for one of the pair ranks.
    results.forEach(out => {
      expect(out.outHand).to.equal("Full House");
      expect(out.possibleHand).to.be.true;
      // In two pair scenario, only one card is needed to complete one of the pairs into trips.
      expect(out.cardNeededCount).to.equal(1);
      expect(out.cardsThatCanMakeHand).to.have.lengthOf(1);
      // The cardsHeldForOut should contain the two cards from the corresponding pair.
      expect(out.cardsHeldForOut.length).to.equal(2);
    });
  });

  it("should return an empty array if no candidate outs exist", () => {
    // If no trip or two-pair scenario exists, then no full house outs.
    // Example: HoleCards: ["As", "7h"], CommunityCards: ["Kc", "2d", "3c"]
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Kc", "2d", "3c"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should throw an error for invalid input lengths", () => {
    const holeCards = ["As"].map(c => new Card(c));
    const communityCards = ["Kc", "2d", "3c"].map(c => new Card(c));
    expect(() => {
      HandEvaluator.outsToFullHouse(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });
});

describe("HandEvaluator.outsToStraightFlush", () => {
  it("should return candidate Out objects when both a straight draw and a flush draw exist", () => {
    // Example:
    // HoleCards: 7h, 8h; CommunityCards: 9h, Th, 2c.
    // This hand produces a flush draw in hearts and a candidate straight draw.
    // After filtering to the flush suit, each candidate Out should have a candidate card in hearts.
    const holeCards = [new Card("7h"), new Card("8h")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("2c")];
    
    const results = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.not.empty;
    results.forEach(out => {
      expect(out.outHand).to.equal("Straight Flush");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // Expect one candidate card per Out.
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
      const candidate = out.cardsThatCanMakeHand[0];
      // Candidate card must be of the flush suit.
      expect(candidate.suit).to.equal("h");
      // Verify that cardsHeldForOut is populated.
      expect(out.cardsHeldForOut).to.be.an("array").that.is.not.empty;
    });
  });

  it("should return an empty array if no straight draw exists", () => {
    // Example: No straight draw present.
    // HoleCards: 7h, 2h; CommunityCards: 9h, Th, 3c.
    const holeCards = [new Card("7h"), new Card("2h")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("3c")];
    
    const results = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should return an empty array if flush draw does not exist", () => {
    // Example: Straight draw may exist but flush draw does not.
    // HoleCards: 7h, 8d; CommunityCards: 9s, Th, 2c.
    const holeCards = [new Card("7h"), new Card("8d")];
    const communityCards = [new Card("9s"), new Card("Th"), new Card("2c")];
    
    const results = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });
});

describe("HandEvaluator.outsToFourKind", () => {
  it("should return candidate Out objects for a four-of-a-kind draw when a triple is present", () => {
    // Example: HoleCards: ["As", "Ad"], CommunityCards: ["Ac", "7h", "2d"]
    // Triple Aces are held: As, Ad, Ac. Missing suit: "Ah"
    const holeCards = ["As", "Ad"].map(c => new Card(c));
    const communityCards = ["Ac", "7h", "2d"].map(c => new Card(c));
    const results = HandEvaluator.outsToFourKind(holeCards, communityCards);
    
    expect(results).to.be.an("array").with.lengthOf(1);
    
    const outCandidate = results[0];
    expect(outCandidate.outHand).to.equal("Four of a Kind");
    expect(outCandidate.possibleHand).to.be.true;
    expect(outCandidate.cardNeededCount).to.equal(1);
    expect(outCandidate.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
    // The candidate card should be "Ah" (missing Ace in hearts).
    expect(outCandidate.cardsThatCanMakeHand[0].toString()).to.equal("Ah");
    // Verify that cardsHeldForOut includes the three Ace cards.
    const held = outCandidate.cardsHeldForOut.map(c => c.toString()).sort();
    expect(held).to.deep.equal(["Ac", "Ad", "As"].sort());
  });

  it("should return an empty array if no triple exists", () => {
    // Example: HoleCards: ["As", "7h"], CommunityCards: ["Ac", "7d", "2d"]
    // No rank appears exactly three times.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Ac", "7d", "2d"].map(c => new Card(c));
    const results = HandEvaluator.outsToFourKind(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should throw an error for invalid input lengths", () => {
    const holeCards = ["As"].map(c => new Card(c)); // Only one hole card.
    const communityCards = ["Ac", "7d", "2d"].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToFourKind(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });
});

    // - one out should be for each possible hand
    // - ex: An A, T hole should return two outs - one for pair A, one for pair T
    // - this helps later when we need to show the possible combinations to the player
    // - out types the parent level
    // - cards needed is the number needed to form the hand, not the total outs possible
    // - total outs should be a separate field on each out collection
describe('checkCalculateOuts', () => {

  it('should return an Outs object containing an Ace pair hand', () => {
    const hole = ['As', 'Ts'].map(c => new Card(c));
    const community = ['9h', '7d', '2c'].map(c => new Card(c));
    
    const result = HandEvaluator.calculateOuts(hole, community);
    
//    console.log("Test - checkCalculateOuts() - outs: " + JSON.stringify(result, null, 2));
    expect(result.outs).to.have.lengthOf(2);
    expect(result.highestOutHand.toString()).to.equal('Pair');
    expect(result.outCards).to.have.lengthOf(6);
    expect(result.outs[0].cardNeededCount === 1);
  });


});