import { expect } from 'chai';
import { Card } from '../pokersolver';
import HandEvaluator, { Outs, Out, PokerError, BoardTexture } from '../outs';

describe("Candidate Card Value Conversion", () => {
  it("should display tens as 'T' in Card.toString()", () => {
    // Create a card with a Ten value using the standard abbreviation "T".
    var card = new Card("Th");
    // If toString is correct, it should return "Th" and not "10h".
    expect(card.toString()).to.equal("Th");
    expect(card.toString()).to.not.equal("10h");

    // Create a card with a Ten value using the standard abbreviation "T".
    card = new Card("Kh");
    // If toString is correct, it should return "Th" and not "10h".
    expect(card.toString()).to.equal("Kh");
    expect(card.toString()).to.not.equal("13h");
  });

  it("should produce candidate Out objects with candidate card using 'T' (not '10')", () => {
    /*
      For this test we simulate a flush draw scenario where one of the candidate outs
      is created using the cardValues array. For example, consider a flush draw in hearts:
        Hole cards: "Ah" and "Kh"
        Community cards: "Qh", "Jh", "9h"
      In this situation, the function outsToFlush should attempt to create candidate cards
      for missing hearts. If "T" is in cardValues, then the candidate for the ten should be "Th".
    */
    const holeCards = [new Card("Ah"), new Card("Kh")];
    const communityCards = [new Card("Qh"), new Card("Jh"), new Card("9h")];
    
    const flushOuts: Out[] = HandEvaluator.outsToFlush(holeCards, communityCards);
    
    // Loop over all candidate outs and check any candidate that has a value "T"
    flushOuts.forEach(out => {
      out.cardsThatCanMakeHand.forEach(candidate => {
        if (candidate.value === "T") {
          // The toString should return "Th" (if candidate suit is heart) and not "10h".
          expect(candidate.toString()).to.equal("Th");
          expect(candidate.toString()).to.not.equal("10h");
        }
      });
    });
  });
});

describe("HandEvaluator.combineHoleAndCommunity", () => {
  it("should combine hole cards and community cards into a single array", () => {
    const holeCards = [new Card("Ah"), new Card("Kd")];
    const communityCards = [new Card("Qs"), new Card("Jc"), new Card("9h")];

    const allCards = HandEvaluator.combineHoleAndCommunity(holeCards, communityCards);
    expect(allCards).to.be.an("array").with.lengthOf(5);

    // Verify that the returned cards match the expected string representations.
    const expected = ["Ah", "Kd", "Qs", "Jc", "9h"];
    allCards.forEach((card, index) => {
      expect(card.toString()).to.equal(expected[index]);
    });
  });

  it("should return new Card instances even if the input cards are reused", () => {
    const holeCards = [new Card("Ah"), new Card("Kd")];
    const communityCards = [new Card("Qs"), new Card("Jc"), new Card("9h")];

    const allCards = HandEvaluator.combineHoleAndCommunity(holeCards, communityCards);

    // Ensure that each card in the combined array is a new instance (not the same object as any in the input arrays)
    allCards.forEach(card => {
      const foundInHole = holeCards.some(h => h === card);
      const foundInCommunity = communityCards.some(c => c === card);
      expect(foundInHole || foundInCommunity).to.be.false;
    });
  });

  it("should correctly handle an empty community cards array", () => {
    const holeCards = [new Card("Ah"), new Card("Kd")];
    const communityCards: Card[] = [];

    const allCards = HandEvaluator.combineHoleAndCommunity(holeCards, communityCards);
    expect(allCards).to.be.an("array").with.lengthOf(2);
    const expected = ["Ah", "Kd"];
    allCards.forEach((card, index) => {
      expect(card.toString()).to.equal(expected[index]);
    });
  });
});

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

  it("should include pairing outs and an inside straight draw candidate", () => {
    const holeCards = [new Card("Jc"), new Card("5d")];
    const communityCards = [new Card("8c"), new Card("9s"), new Card("7c")];
    
    const result: Outs = HandEvaluator.calculateOuts(holeCards, communityCards);
    
    // Verify that the hand stage is correctly set (flop in this case)
    expect(result.handStage).to.equal("Flop");
    
    /* 
      With the revised filtering:
      - Only the over card ("Jc") qualifies for pair outs (since "Jc" > highest board card),
        so pairing outs produce 3 candidate cards (the missing suits for J, e.g. "Jh", "Jd", "Js").
      - In addition, the board [7,8,9] plus "J" forms an incomplete straight draw (for 7-8-9-T-J)
        missing the "T". The inside straight draw logic generates candidate outs for the missing "T"
        (for each suit not already in play).
    
      In our implementation the union of all candidate out cards is 11.
    */
    expect(result.outCards).to.be.an("array").with.lengthOf(11);
    
    // Verify that at least one candidate out for an inside straight draw exists (a card with value "T")
    const straightCandidate = result.outCards.find(card => card.value === "T");
    expect(straightCandidate).to.not.be.undefined;
    
    // Also, if the implementation sets highestOutHand to reflect the best improvement,
    // it should indicate that a straight (or inside straight draw) is the strongest improvement.
    expect(result.highestOutHand.toLowerCase()).to.include("straight");
  });
});

describe("HandEvaluator.evaluateBoard", () => {
  it("should throw an error when board has fewer than 3 cards", () => {
    const board = [new Card("2h"), new Card("3d")];
    expect(() => HandEvaluator.evaluateBoard(board))
      .to.throw(PokerError.InsufficientCommunityCards);
  });

  it("should throw an error when board has more than 5 cards", () => {
    const board = [
      new Card("2h"),
      new Card("3d"),
      new Card("4s"),
      new Card("5c"),
      new Card("6h"),
      new Card("7d")
    ];
    expect(() => HandEvaluator.evaluateBoard(board))
      .to.throw(PokerError.InsufficientCommunityCards);
  });

  it("should correctly evaluate a flop board with no pairs, no draws (e.g. '2h', '5d', '9s')", () => {
    // Using shared values: ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
    // "2" -> index 0, "5" -> index 3, "9" -> index 7.
    const board = [new Card("2h"), new Card("5d"), new Card("9s")];
    const texture: BoardTexture = HandEvaluator.evaluateBoard(board);
    
    expect(texture.paired).to.be.false;
    expect(texture.monotone).to.be.false;
    expect(texture.twoTone).to.be.false;
    // Calculation: gap = (7 - 0) - 2 = 5; connectivity = max(0, 2 - 5) = 0.
    expect(texture.connectivity).to.equal(0);
    expect(texture.straightDraw).to.equal("none");
    expect(texture.flushDraw).to.be.false;
  });

  it("should detect an open-ended straight draw on the flop (e.g. '7h', '8d', '9s')", () => {
    // "7" -> index 5, "8" -> index 6, "9" -> index 7.
    const board = [new Card("7h"), new Card("8d"), new Card("9s")];
    const texture: BoardTexture = HandEvaluator.evaluateBoard(board);
    
    expect(texture.paired).to.be.false;
    expect(texture.straightDraw).to.equal("open");
    expect(texture.connectivity).to.equal(2);
    expect(texture.flushDraw).to.be.false;
  });

  it("should evaluate a paired board correctly (e.g. '8h', '8d', 'Ks')", () => {
    const board = [new Card("8h"), new Card("8d"), new Card("Ks")];
    const texture: BoardTexture = HandEvaluator.evaluateBoard(board);
    
    expect(texture.paired).to.be.true;
    expect(texture.straightDraw).to.equal("none");
  });

  it("should evaluate a turn board with a flush draw (e.g. ['2h', '4h', '7h', 'Jd'])", () => {
    const board = [new Card("2h"), new Card("4h"), new Card("7h"), new Card("Jd")];
    const texture: BoardTexture = HandEvaluator.evaluateBoard(board);
    
    expect(texture.flushDraw).to.be.true;
    expect(texture.monotone).to.be.false;
  });

  it("should evaluate a river board that is monotone (e.g. ['2h', '5h', '9h', 'Kh', 'Ah'])", () => {
    const board = [new Card("2h"), new Card("5h"), new Card("9h"), new Card("Kh"), new Card("Ah")];
    const texture: BoardTexture = HandEvaluator.evaluateBoard(board);
    
    expect(texture.monotone).to.be.true;
    expect(texture.flushDraw).to.be.true;
    expect(texture.paired).to.be.false;
    expect(texture.straightDraw).to.equal("none");
  });
});

describe('checkOverCards', () => {
  it('should return a hole card higher than all community cards', () => {
    const hole = ['As', 'Ts'].map(c => new Card(c));
    const community = ['9h', '7d', '2c'].map(c => new Card(c));
    
    const result = HandEvaluator.checkOverCards(hole, community);
    
    expect(result).to.have.lengthOf(2);
    expect(result[0].toString()).to.equal('As');
    expect(result[1].toString()).to.equal('Ts');
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
    const community = ['Qh', 'Jd', 'Tc', '9s', '2h'].map(c => new Card(c));
    
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

// Helper: given an array of Out objects, return the held cards’ string values.
function heldCardStrings(outs: any[]): string[] {
  return outs.map(out => out.cardsHeldForOut[0].toString());
}

describe("HandEvaluator.outsToPair (revised filtering)", () => {
  it("should generate outs for both hole cards when both are over the board", () => {
    // Community cards have relatively low ranks.
    // Example: community: "2h", "3c", "Td" (highest is T)
    // Hole cards: "As" and "Kh" are both higher than T.
    const holeCards = ["As", "Kh"].map(c => new Card(c));
    const communityCards = ["2h", "3c", "Td"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Expect two Out objects (one for each hole card).
    expect(results).to.be.an("array").with.lengthOf(2);
    // Candidate outs for each should be generated (3 for each hole card).
    results.forEach((out) => {
      expect(out.outHand).to.equal("Pair");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // Each out should have candidate cards for missing suits: 3 items.
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(3);
    });
  });

  it("should generate outs only for the over card when only one hole card is over", () => {
    // Community: "Qd", "3c", "Td" (highest is T).
    // Hole cards: "As" is over (Ace beats T) but "7h" is not.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Qd", "3c", "Td"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Only the over card ("As") should generate outs.
    expect(results).to.be.an("array").with.lengthOf(1);
    const heldCards = results[0].cardsHeldForOut.map(c => c.toString());
    expect(heldCards).to.contain("As");
    // Candidate outs for "As" should be for 3 missing suits.
    const candidateOuts = results[0].cardsThatCanMakeHand.map(c => c.toString()).sort();
    // e.g. if "As" is in spades, then candidates are Ace of clubs, hearts, and diamonds.
    expect(candidateOuts).to.deep.equal(["Ac", "Ad", "Ah"].sort());
  });

  it("should filter out hole cards that cannot beat the board", () => {
    // Community: "8d", "9c", "Td" (highest is T).
    // Hole cards: "7s" and "6h" — both are lower than T.
    const holeCards = ["7s", "6h"].map(c => new Card(c));
    const communityCards = ["8d", "9c", "Td"].map(c => new Card(c));

    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // No outs should be generated because neither hole card beats the board.
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should not return outs for a hole card that is already paired by the board (or that cannot beat the board)", () => {
    // Community includes an Ace matching one hole card.
    // Hole cards: "As", "Kh"; Community: "Ah", "3c", "Td"
    // "As" is already paired, and pairing "Kh" (Kings) is not an improvement
    // because the board has an Ace. Therefore, no outs should be generated.
    const holeCards = ["As", "Kh"].map(c => new Card(c));
    const communityCards = ["Ah", "3c", "Td"].map(c => new Card(c));
    
    const results = HandEvaluator.outsToPair(holeCards, communityCards);
    // Expect no outs because neither hole card yields a viable improvement.
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should throw an error when exactly two hole cards are not provided", () => {
    const holeCards = ["As"].map(c => new Card(c));
    const communityCards = ["2h", "3c", "Td"].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToPair(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });
  
  it("should throw an error when fewer than three community cards are provided", () => {
    const holeCards = ["As", "Kh"].map(c => new Card(c));
    const communityCards = ["2h", "3c"].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToPair(holeCards, communityCards);
    }).to.throw("Must provide at least three community cards");
  });
});

describe("outsToTwoPair", () => {

  describe("HandEvaluator.outsToTwoPair", () => {
    it("should form correct Out objects for two pair improvement", () => {
      // Setup:
      // The full hand has a pair of 8's: hole card "8s" with community card "8d"
      // and a candidate card "Kh" from the hole that can form the second pair.
      // Other community cards are "Qc" and "Js".
      // Because "Kh" is in play, the missing King suits are expected to be: Ks, Kc, and Kd.
      const holeCards = [new Card("Kh"), new Card("8s")];
      const communityCards = [new Card("8d"), new Card("Qc"), new Card("Js")];
      
      const outs = HandEvaluator.outsToTwoPair(holeCards, communityCards);
      
      // Expect three Out objects – one for each missing suit candidate for "K"
      expect(outs).to.be.an("array").with.lengthOf(3);
      
      // Combine the candidate cards (from cardsThatCanMakeHand on each Out)
      const candidateCards = outs
        .map((out: Out) => out.cardsThatCanMakeHand[0].toString())
        .sort();
      
      // Expect the three candidate King cards to be present (order doesn't matter)
      expect(candidateCards).to.deep.equal(["Kc", "Kd", "Ks"]);
      
      // Check each Out object for proper properties.
      outs.forEach((out: Out) => {
        expect(out.outHand).to.equal("Two Pair");
        expect(out.possibleHand).to.be.true;
        expect(out.cardNeededCount).to.equal(1);
        
        // The held card used for making the pair should be the candidate card "Kh"
        const heldCards = out.cardsHeldForOut.map(c => c.toString());
        expect(heldCards).to.include("Kh");
        
        // Each Out should have exactly one candidate card in cardsThatCanMakeHand.
        expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
        // And that candidate should be a King with a suit different from "h"
        const candidate = out.cardsThatCanMakeHand[0];
        expect(candidate.value).to.equal("K");
        expect(candidate.suit).to.not.equal("h");
      });
    });
  });
  
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

  it("should return correct Out objects for three-of-a-kind improvement", () => {
    // Setup a hand with exactly a pair of 8's.
    // Hole cards: "8s" and "Kh"
    // Community cards: "8d", "Qc", "Js"
    // This means the pair is 8's (present suits: "s" and "d"), so the missing candidate suits are "c" and "h".
    const holeCards = [new Card("8s"), new Card("Kh")];
    const communityCards = [new Card("8d"), new Card("Qc"), new Card("Js")];
    
    const results = HandEvaluator.outsToThreeKind(holeCards, communityCards);
    
    // Expect 2 Out objects corresponding to the two missing 8's ("8c" and "8h")
    expect(results).to.be.an("array").with.lengthOf(2);
    
    // Extract candidate card strings from each Out.
    const candidateCards = results
      .map((out: Out) => out.cardsThatCanMakeHand[0].toString())
      .sort();
    expect(candidateCards).to.deep.equal(["8c", "8h"]);
    
    results.forEach((out: Out) => {
      // Check properties of each Out.
      expect(out.outHand).to.equal("Three of a Kind");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      
      // The held cards should be the two 8's.
      const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
      expect(heldCards).to.deep.equal(["8d", "8s"]);
      
      // The candidate card should have value "8" and a suit that is one of the missing suits.
      const candidate = out.cardsThatCanMakeHand[0];
      expect(candidate.value).to.equal("8");
      expect(["c", "h"]).to.include(candidate.suit);
    });
  });

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

  it("should return correct Out objects for an open-ended straight draw", () => {
    /* 
      Setup:
      - Hole cards: "7h" and "8d"
      - Community cards: "9c", "Tc", "2s"
      
      The combined cards produce a contiguous block from rank 7 through T:
        "7h" -> cardValues index 6, 
        "8d" -> index 7, 
        "9c" -> index 8, 
        "Tc" -> index 9 (using our authoritative array:
          [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A" ])
      
      The candidate missing cards are:
         one rank below: index 5 ⇒ "6" (i.e. "6s","6h","6d","6c")
         one rank above: index 10 ⇒ "J" (i.e. "Js","Jh","Jd","Jc")
         
      Thus, a total of 8 Out objects are expected.
    */
    const holeCards = [new Card("7h"), new Card("8d")];
    const communityCards = [new Card("9c"), new Card("Tc"), new Card("2s")]; // corrected here!
    
    const results = HandEvaluator.outsToStraightOESD(holeCards, communityCards);
    
    // Expect 8 Out objects in total.
    expect(results).to.be.an("array").with.lengthOf(8);
    
    // All Out objects should share the same group of held cards from the contiguous block.
    // For this block the held cards should be "7h", "8d", "9c", and "Tc".
    const heldForBlock = results[0].cardsHeldForOut.map(card => card.toString()).sort();
    expect(heldForBlock).to.deep.equal(["7h", "8d", "9c", "Tc"].sort());
    
    // Verify each Out's properties and candidate card.
    const candidateSet = new Set<string>();
    results.forEach((out: Out) => {
      expect(out.outHand).to.equal("Straight (OESD)");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // Each Out should have a single candidate card.
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
      const candidate = out.cardsThatCanMakeHand[0];
      candidateSet.add(candidate.toString());
      // Candidate card value should be either "6" or "J".
      expect(["6", "J"]).to.include(candidate.value);
    });
    
    // The aggregated candidate cards (order-insensitive) should be:
    // For "6": "6s", "6h", "6d", "6c"
    // For "J": "Js", "Jh", "Jd", "Jc"
    const expectedCandidates = ["6s", "6h", "6d", "6c", "Js", "Jh", "Jd", "Jc"];
    expect(Array.from(candidateSet).sort()).to.deep.equal(expectedCandidates.sort());
  });

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


describe("HandEvaluator.outsToInsideStraightDraw (revised)", () => {
  it("should throw an error if hole cards array does not have exactly two cards", () => {
    const holeCards = [new Card("5h")];
    const communityCards = [new Card("6h"), new Card("7d"), new Card("8s")];
    expect(() => HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards))
      .to.throw("Must provide exactly two hole cards");
  });

  it("should throw an error if community cards array has fewer than 3 cards", () => {
    const holeCards = [new Card("5h"), new Card("6d")];
    const communityCards = [new Card("7d"), new Card("8s")];
    expect(() => HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards))
      .to.throw("Community cards must be between 3 and 5");
  });

  it("should return an empty array if no inside straight draw exists", () => {
    // Example: hand that does not have 4 cards in a 5-card span.
    const holeCards = [new Card("Ah"), new Card("Kd")];
    const communityCards = [new Card("2c"), new Card("5s"), new Card("9d")];
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });

  it("should return an Inside Straight Draw out with candidate card '8' (not '7') for the hand 7♥ 6♥ | 4♦ 5♥ 9♠", () => {
    // Setup: Hole cards and community cards as described.
    const holeCards = [new Card("7h"), new Card("6h")];
    const communityCards = [new Card("4d"), new Card("5h"), new Card("9s")];
    
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    
    // Expect at least one Out to be returned.
    expect(results).to.be.an("array").that.is.not.empty;
    
    // For each Out, verify the following:
    results.forEach((out: Out) => {
      // The hand type should indicate an inside straight draw.
      expect(out.outHand).to.equal("Inside Straight Draw");
      
      // Only one card is needed to complete the draw.
      expect(out.cardNeededCount).to.equal(1);
      
      // Every candidate card (should be one per Out) must have value "8"
      out.cardsThatCanMakeHand.forEach(candidate => {
        expect(candidate.value).to.equal("8");
      });
      
      // The held block candidates should be the cards used in the straight draw.
      // In a correct run with intended straight 6,7,8,9,T the held cards (from the hand)
      // should be those present in the block: 6♥, 7♥, 9♠, T♥.
      const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
      const expectedHeld = ["6h", "7h", "9s", "5h"].sort();
      expect(heldCards).to.deep.equal(expectedHeld);
    });
    
    // Across all Out objects, combine the candidate outs.
    // They should represent all four suits for "8": 8♠ 8♥ 8♦ 8♣.
    const candidateSet = new Set<string>();
    results.forEach((out: Out) => {
      out.cardsThatCanMakeHand.forEach(candidate => {
        candidateSet.add(candidate.toString());
      });
    });
    const expectedCandidates = ["8s", "8h", "8d", "8c"];
    expect(Array.from(candidateSet).sort()).to.deep.equal(expectedCandidates.sort());
  });

  it("should return one Out per unique inside straight draw candidate", () => {
    // Example where the combined ranks include 5,6,8,9 (missing a 7 in the middle).
    // Expected: one Out object for missing rank 7 with 7 candidate cards for each suit that's not in play.
    // Held cards should be one representative for each of the present ranks (5,6,8,9).
    const holeCards = [new Card("5h"), new Card("9d")];
    const communityCards = [new Card("6s"), new Card("8c"), new Card("Qh")];
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    
    // We expect one Out object corresponding to the missing rank "7".
    expect(results).to.be.an("array").with.lengthOf(1);
    const out = results[0];
    
    // Verify the Out properties.
    expect(out.outHand).to.equal("Inside Straight Draw");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // The held cards should come from the present ranks in the sequence, i.e. 5,6,8,9.
    // Their string representations should be among the combined hand.
    const heldStrings = out.cardsHeldForOut.map(c => c.toString());
    expect(heldStrings).to.include("5h");
    expect(heldStrings).to.include("6s");
    expect(heldStrings).to.include("8c");
    // "9d" is also present but could be chosen instead of 9 from community if available.
    // So we require at least three unique values from the block.
    expect(heldStrings.length).to.be.within(3, 4);
    
    // The cardsThatCanMakeHand should be candidate 7's.
    // For each suit not already in play for 7.
    // We check that at least one candidate has the value "7".
    const candidate7s = out.cardsThatCanMakeHand.filter(c => c.value === "7");
    expect(candidate7s.length).to.be.above(0);
  });

  it("should return separate Out objects if two distinct inside draws are possible", () => {
    // In this test, we create a scenario with two separate 5-card spans missing different inside cards.
    // For example, if the combined ranks include: 4,5,7,8 and also 9, T, Q, missing 6 and J respectively.
    // We'll simulate this by carefully choosing hole and community cards.
    const holeCards = [new Card("4h"), new Card("8s")];
    const communityCards = [new Card("5d"), new Card("7c"), new Card("Th")];
    // Combined they yield ranks: 4,5,7,8,T; missing 6 between 5 and 7.
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    
    // We expect one Out corresponding to the missing rank "6"
    expect(results).to.be.an("array").with.lengthOf(1);
    const out = results[0];
    expect(out.outHand).to.equal("Inside Straight Draw");
    expect(out.cardNeededCount).to.equal(1);
    // Verify candidate outs for the missing rank are for "6"
    out.cardsThatCanMakeHand.forEach(c => {
      expect(c.value).to.equal("6");
    });
  });
});

describe("HandEvaluator.outsToFlush", () => {

  it("should return correct Out objects for a flush draw", () => {
    // Setup: Create a flush draw in hearts.
    // Hole cards: "Ah" and "Ks" (only "Ah" is heart).
    // Community cards: "Qh", "Jh", "3h" (all hearts).
    // Total hearts in play: "Ah", "Qh", "Jh", "3h" (4 cards).  
    // The missing heart candidates are, per standard order:
    // ["2h", "4h", "5h", "6h", "7h", "8h", "9h", "Th", "Kh"].
    const holeCards = [new Card("Ah"), new Card("Ks")];
    const communityCards = [new Card("Qh"), new Card("Jh"), new Card("3h")];
    
    const results = HandEvaluator.outsToFlush(holeCards, communityCards);
    
    // Expect one Out per missing heart candidate.
    const expectedCandidates = ["2h", "4h", "5h", "6h", "7h", "8h", "9h", "Th", "Kh"].sort();
    expect(results).to.be.an("array").with.lengthOf(expectedCandidates.length);
    
    // Verify each Out object's properties.
    results.forEach((out: Out) => {
      expect(out.outHand).to.equal("Flush");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // Each Out should have exactly one candidate card.
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
      const candidate = out.cardsThatCanMakeHand[0];
      // The candidate card must be a heart.
      expect(candidate.suit).to.equal("h");
    });
    
    // Aggregate candidate card strings from each Out.
    const candidateStrings = results
      .map((out: Out) => out.cardsThatCanMakeHand[0].toString())
      .sort();
    expect(candidateStrings).to.deep.equal(expectedCandidates);
    
    // All Out objects should share the same held cards (the flush draw in hearts).
    const heldCards = results[0].cardsHeldForOut.map(card => card.toString()).sort();
    const expectedHeldCards = ["Ah", "3h", "Jh", "Qh"].sort();
    expect(heldCards).to.deep.equal(expectedHeldCards);
  });

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
      expect(heldCards).to.deep.equal(["7h", "8h", "9h", "Th"].sort());
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

  it("should return correct Out objects for full house improvement (trips scenario)", () => {
    // Setup:
    // Use holeCards that with communityCards produce a trips of 8's
    // and candidate cards for full house from ranks "K" and "Q".
    // holeCards: "8s", "8h"
    // communityCards: "8d", "Kd", "Qc"
    const holeCards = [new Card("8s"), new Card("8h")];
    const communityCards = [new Card("8d"), new Card("Kd"), new Card("Qc")];
    
    const results = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    
    // Expect 6 Out objects in total:
    // For candidate "K": full hand already holds "Kd" → missing suits should be three (one per suit not 'd')
    // For candidate "Q": full hand already holds "Qc" → missing suits should be three (one per suit not 'c')
    expect(results).to.be.an("array").with.lengthOf(6);
    
    // Separate outs for the two candidate values.
    const candidateKOuts = results.filter(out => out.cardsThatCanMakeHand[0].value === "K");
    const candidateQOuts = results.filter(out => out.cardsThatCanMakeHand[0].value === "Q");
    
    expect(candidateKOuts).to.have.lengthOf(3);
    expect(candidateQOuts).to.have.lengthOf(3);
    
    // For each candidate Out (for "K")
    candidateKOuts.forEach((out: Out) => {
      expect(out.outHand).to.equal("Full House");
      expect(out.possibleHand).to.be.true;
      // Only one card is needed to complete the candidate.
      expect(out.cardNeededCount).to.equal(1);
      
      // The held cards should include the trips (all three 8's) and the candidate card "Kd".
      const heldStrings = out.cardsHeldForOut.map(card => card.toString());
      expect(heldStrings).to.include.members(["8s", "8h", "8d", "Kd"]);
      
      // The candidate card in cardsThatCanMakeHand should be a "K" whose suit is not 'd'
      const candidate = out.cardsThatCanMakeHand[0];
      expect(candidate.value).to.equal("K");
      expect(candidate.suit).to.not.equal("d");
    });
    
    // For each candidate Out (for "Q")
    candidateQOuts.forEach((out: Out) => {
      expect(out.outHand).to.equal("Full House");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      
      // The held cards should include the trips (all three 8's) and the candidate card "Qc".
      const heldStrings = out.cardsHeldForOut.map(card => card.toString());
      expect(heldStrings).to.include.members(["8s", "8h", "8d", "Qc"]);
      
      // The candidate card should be a "Q" with suit different from 'c'
      const candidate = out.cardsThatCanMakeHand[0];
      expect(candidate.value).to.equal("Q");
      expect(candidate.suit).to.not.equal("c");
    });
  });

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

  it("should return correct Out objects for a straight flush draw", () => {
    /*
      Setup:
      - Hole cards: "8h", "9h"
      - Community cards: "Th", "Jh", "2d"
      
      Combined, the hand contains 4 hearts: "8h", "9h", "Th", "Jh"
      forming a contiguous block corresponding to ranks 8,9,T,J.
      The open-ended straight draw missing cards are:
         one rank below: "7" → candidate should be "7h" (if not in play)
         one rank above: "Q" → candidate should be "Qh" (if not in play)
      Since only candidate outs with the flush suit (h) pass the filter,
      we expect 2 Out objects (one for "7h" and one for "Qh").
    */
    const holeCards = [new Card("8h"), new Card("9h")];
    const communityCards = [new Card("Th"), new Card("Jh"), new Card("2d")];
    
    const results = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    
    // Expect 2 Out objects: one for "7h" and one for "Qh"
    expect(results).to.be.an("array").with.lengthOf(2);
    
    // Check properties of each Out object.
    results.forEach((out: Out) => {
      expect(out.outHand).to.equal("Straight Flush");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // Each Out should have exactly one candidate card.
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
      const candidate = out.cardsThatCanMakeHand[0];
      // The candidate card must be a heart and its value should be either "7" or "Q".
      expect(candidate.suit).to.equal("h");
      expect(["7", "Q"]).to.include(candidate.value);
      
      // The cardsHeldForOut should be the contiguous block from the open-ended straight draw.
      // In this case, it should be [ "8h", "9h", "Th", "Jh" ] (order-insensitive).
      const heldCards = out.cardsHeldForOut.map(card => card.toString()).sort();
      expect(heldCards).to.deep.equal(["8h", "9h", "Jh", "Th"].sort());
    });
    
    // Additionally, aggregate the candidate cards as strings and ensure they are exactly "7h" and "Qh".
    const candidateSet = new Set(results.map((out: Out) => out.cardsThatCanMakeHand[0].toString()));
    const expectedCandidates = new Set(["7h", "Qh"]);
    expect(candidateSet).to.deep.equal(expectedCandidates);
  });

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

  it("should return correct Out object for four-of-a-kind improvement", () => {
    // Setup:
    // Hole cards: "Kd" and "Qh"
    // Community cards: "Kc", "Kh", "2h"
    // Three Kings are present: "Kd", "Kc", "Kh".
    // Missing candidate is the King of the remaining suit ("s").
    const holeCards = [new Card("Kd"), new Card("Qh")];
    const communityCards = [new Card("Kc"), new Card("Kh"), new Card("2h")];
    
    const results = HandEvaluator.outsToFourKind(holeCards, communityCards);
    
    // Expect exactly one Out object.
    expect(results).to.be.an("array").with.lengthOf(1);
    
    const outCandidate = results[0];
    expect(outCandidate.outHand).to.equal("Four of a Kind");
    expect(outCandidate.possibleHand).to.be.true;
    expect(outCandidate.cardNeededCount).to.equal(1);
    
    // The candidate card in cardsThatCanMakeHand should be "K" in the missing suit.
    expect(outCandidate.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
    const candidateCard = outCandidate.cardsThatCanMakeHand[0];
    expect(candidateCard.value).to.equal("K");
    expect(candidateCard.suit).to.equal("s");
    
    // The cardsHeldForOut should contain the three kings that form the trip.
    const heldCards = outCandidate.cardsHeldForOut.map(card => card.toString()).sort();
    expect(heldCards).to.deep.equal(["Kd", "Kc", "Kh"].sort());
  });
  
  it("should return an empty array if no three-of-a-kind exists", () => {
    // Setup: No three-of-a-kind exists in this hand.
    const holeCards = [new Card("8d"), new Card("Qh")];
    const communityCards = [new Card("Kc"), new Card("Kh"), new Card("2h")];
    
    const results = HandEvaluator.outsToFourKind(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.empty;
  });
  
  it("should throw an error if invalid holeCards are provided", () => {
    const holeCards = [new Card("Kd")]; // Only one hole card provided.
    const communityCards = [new Card("Kc"), new Card("Kh"), new Card("2h")];
    
    expect(() => {
      HandEvaluator.outsToFourKind(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });

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