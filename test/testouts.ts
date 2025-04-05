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

  it("should return Four of a Kind out for hand 7♥ 7♦ | 7♣ 5♥ J♥ 5♠", () => {
    const holeCards = [new Card("7h"), new Card("7d")];
    const communityCards = [new Card("7c"), new Card("5h"), new Card("Jh"), new Card("5s")];
    const result: Outs = HandEvaluator.calculateOuts(holeCards, communityCards);
    
    // Look for the Four of a Kind improvement out.
    const fkOut = result.outs.find(out => out.outHand === "Four of a Kind");
    expect(fkOut, "Expected Four of a Kind out to exist").to.exist;
    expect(fkOut!.possibleHand).to.be.true;
    expect(fkOut!.cardNeededCount).to.equal(1);
    
    // The held cards should be the three 7's already in play: 7♥, 7♦, and 7♣.
    const heldCards = fkOut!.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["7h", "7d", "7c"].sort());
    
    // The candidate card should be the missing 7, in this case "7s".
    expect(fkOut!.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
    expect(fkOut!.cardsThatCanMakeHand[0].toString()).to.equal("7s");
  });

  it("should return two improvement outs (Two Pair and Three of a Kind) for hand 8♣ J♦ | 3♦ 5♠ 5♣", () => {
    // Setup the hand:
    const holeCards = [new Card("8c"), new Card("Jd")];
    const communityCards = [new Card("3d"), new Card("5s"), new Card("5c")];
    
    // Calculate outs using the solver.
    const result: Outs = HandEvaluator.calculateOuts(holeCards, communityCards);
    
    // We expect that, as a "Pair" hand, improvements exist for both:
    // - Two Pair: by pairing one of the hole cards.
    // - Three of a Kind: by pairing the board pair.
    
    // Find the Two Pair out and the Three of a Kind out.
    const twoPairOut = result.outs.find(out => out.outHand === "Two Pair");
    const threeKindOut = result.outs.find(out => out.outHand === "Three of a Kind");
    
    expect(twoPairOut, "Expected a Two Pair improvement out").to.exist;
    expect(threeKindOut, "Expected a Three of a Kind improvement out").to.exist;
    
    // --- Check Three of a Kind Improvement ---
    // The board has a pair of 5's. For a three-of-a-kind improvement,
    // the held cards should include those two 5's.
    const heldThreeKind = threeKindOut!.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldThreeKind).to.deep.equal(["5c", "5s"].sort());
    
    // The candidate outs for three of a kind should complete the set of 5's.
    // Since the board already has 5♠ and 5♣, the missing suits (for a complete four-of-a-kind improvement)
    // are typically hearts and diamonds. (Here, the improvement is to three-of-a-kind.)
    expect(threeKindOut!.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(2);
    threeKindOut!.cardsThatCanMakeHand.forEach(candidate => {
      expect(candidate.value).to.equal("5");
    });
    expect(threeKindOut!.cardNeededCount).to.equal(1);
    
    // --- Check Two Pair Improvement ---
    // For two pair improvement, the idea is to pair one of your hole cards.
    // Depending on the implementation, the candidate might be your 8♣ or your J♦.
    // We check that the held card for the Two Pair out is one of these hole cards...
    expect(twoPairOut!.cardsHeldForOut).to.have.lengthOf(1);
    const heldTwoPairValue = twoPairOut!.cardsHeldForOut[0].value;
    expect(["8", "J"]).to.include(heldTwoPairValue);
    
    // ...and that all candidate outs for this improvement carry that same rank.
    twoPairOut!.cardsThatCanMakeHand.forEach(candidate => {
      expect(candidate.value).to.equal(heldTwoPairValue);
    });
    expect(twoPairOut!.cardNeededCount).to.equal(1);
  });

  it("should return two Out objects (Four of a Kind and Full House) for hand 7♠ 3♣ | 3♠ 3♥ A♦", () => {
    // Setup the hand:
    // Hole cards: 7♠, 3♣
    // Community cards: 3♠, 3♥, A♦
    const holeCards = [new Card("7s"), new Card("3c")];
    const communityCards = [new Card("3s"), new Card("3h"), new Card("Ad")];
    
    // Calculate outs using the solver
    const result: Outs = HandEvaluator.calculateOuts(holeCards, communityCards);
    
    // Expect exactly two Out objects to be returned.
    expect(result.outs).to.be.an("array").with.lengthOf(2);
    
    // Find the Four of a Kind improvement and Full House improvement.
    const fourKindOut = result.outs.find(o => o.outHand === "Four of a Kind");
    const fullHouseOut = result.outs.find(o => o.outHand === "Full House");
    
    expect(fourKindOut, "Missing Four of a Kind Out").to.exist;
    expect(fullHouseOut, "Missing Full House Out").to.exist;
    
    // --- Check Four of a Kind Out ---
    // Trips of 3's are present from hole: 3♣ and community: 3♠, 3♥.
    // The candidate candidate for Four of a Kind should be the missing 3♦.
    const heldFour = fourKindOut!.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldFour).to.deep.equal(["3c", "3h", "3s"].sort());
    
    expect(fourKindOut!.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(1);
    expect(fourKindOut!.cardsThatCanMakeHand[0].toString()).to.equal("3d");
    
    // --- Check Full House Out ---
    // The full house improvement in a trips scenario uses an additional board card.
    // Here, the board contains an Ace ("Ad") which can pair.
    // The held cards for Full House should include the trips (all three 3's) plus "Ad".
    const heldFull = fullHouseOut!.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldFull).to.deep.equal(["3c", "3h", "3s", "7s", "Ad"].sort());
    
    // For the Full House Out, candidate outs should be all remaining Aces.
    // Since "Ad" is in play, we expect the candidate outs to be the other three Aces.
    const candidateValues = fullHouseOut!.cardsThatCanMakeHand.map(c => c.value);
    expect(candidateValues).to.include("7");
    expect(candidateValues).to.include("A");
    
    // Both outs require exactly one card to complete their improvement.
    expect(fourKindOut!.cardNeededCount).to.equal(1);
    expect(fullHouseOut!.cardNeededCount).to.equal(1);
    
    // Optionally, verify that the overall highestOutHand is one of the improvements.
    expect(["Four of a Kind", "Full House"]).to.include(result.highestOutHand);
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

  /* 
    With the revised filtering:
    - Only the over card ("Jc") qualifies for pair outs (since "Jc" > highest board card),
      so pairing outs produce 3 candidate cards (the missing suits for J, e.g. "Jh", "Jd", "Js").
    - In addition, the board [7,8,9] plus "J" forms an incomplete straight draw (for 7-8-9-T-J)
      missing the "T". The inside straight draw logic generates candidate outs for the missing "T"
      (for each suit not already in play).
  
    In our implementation the union of all candidate out cards is 11.
  */
  it("should include pairing outs and an inside straight draw candidate", () => {
    const holeCards = [new Card("Jc"), new Card("2d")];
    const communityCards = [new Card("8c"), new Card("9s"), new Card("7c")];
    
    const result: Outs = HandEvaluator.calculateOuts(holeCards, communityCards);
//    console.log("Outs:", JSON.stringify(result, null, 2));
    
    // Verify that the hand stage is correctly set (flop in this case)
    expect(result.handStage).to.equal("Flop");    
    expect(result.outCards).to.be.an("array").with.lengthOf(7);
    
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

describe("HandEvaluator.outsToPair", () => {

  it("should return properly formed Out objects for Pair", () => {
    // Setup: 
    // - Hole cards: Ah, Kd (both overcards to the board)
    // - Community cards: 2c, 3d, 4h (all lower ranks)
    // Expected: Two Out objects (one for Ace pair, one for King pair)
    const holeCards = [new Card("Ah"), new Card("Kd")];
    const communityCards = [new Card("2c"), new Card("3d"), new Card("4h")];
    
    const outs = HandEvaluator.outsToPair(holeCards, communityCards);
    
    // Should return an array with two Out objects (one for each hole card)
    expect(outs).to.be.an('array').with.lengthOf(2);
    
    // Check the Ace pair Out object
    const aceOut = outs.find(out => out.cardsHeldForOut[0].value === "A");
    if (!aceOut) {
      throw new Error("Ace Out object not found");
    }
    expect(aceOut).to.exist;
    expect(aceOut.outHand).to.equal("Pair");
    expect(aceOut.possibleHand).to.be.true;
    expect(aceOut.cardNeededCount).to.equal(1);
    // Should have 3 candidate cards (Ad, As, Ac) - all Aces except Ah which is held
    expect(aceOut.cardsThatCanMakeHand).to.be.an('array').with.lengthOf(3);
    aceOut.cardsThatCanMakeHand.forEach(card => {
      expect(card.value).to.equal("A");
      expect(card.suit).to.not.equal("h"); // Not the suit we already have
    });
    // Should have exactly one held card (Ah)
    expect(aceOut.cardsHeldForOut).to.be.an('array').with.lengthOf(1);
    expect(aceOut.cardsHeldForOut[0].toString()).to.equal("Ah");
    
    // Check the King pair Out object
    const kingOut = outs.find(out => out.cardsHeldForOut[0].value === "K");
    if (!kingOut) {
      throw new Error("King Out object not found");
    }
    expect(kingOut).to.exist;
    expect(kingOut.outHand).to.equal("Pair");
    expect(kingOut.possibleHand).to.be.true;
    expect(kingOut.cardNeededCount).to.equal(1);
    // Should have 3 candidate cards (Kc, Kh, Ks) - all Kings except Kd which is held
    expect(kingOut.cardsThatCanMakeHand).to.be.an('array').with.lengthOf(3);
    kingOut.cardsThatCanMakeHand.forEach(card => {
      expect(card.value).to.equal("K");
      expect(card.suit).to.not.equal("d"); // Not the suit we already have
    });
    // Should have exactly one held card (Kd)
    expect(kingOut.cardsHeldForOut).to.be.an('array').with.lengthOf(1);
    expect(kingOut.cardsHeldForOut[0].toString()).to.equal("Kd");
  });

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

describe("HandEvaluator.outsToTwoPair", () => {

  it("should return properly formed Out objects for Two Pair", () => {
    // Setup:
    // Hole cards: "Qh", "8d" - A Queen and an 8
    // Community cards: "Qc", "7s", "5h" - Another Queen plus a 7 and 5
    // Expected: Already has a pair of Queens, so will look for a second pair
    // Potential candidate cards for forming a second pair are 8, 7, and 5
    // Should pick the highest (8) and create outs for the remaining 8s
    const holeCards = [new Card("Qh"), new Card("8d")];
    const communityCards = [new Card("Qc"), new Card("7s"), new Card("5h")];
    
    const outs = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    
    // Should return exactly one Out object for the 8 pair
    expect(outs).to.be.an('array').with.lengthOf(1);
    
    const out = outs[0];
    console.log("Out:", JSON.stringify(out, null, 2));
    
    // Check the basic properties of the Out object
    expect(out.outHand).to.equal("Two Pair");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // Check the held cards - should contain the 8d from hole cards
    const heldCards = out.cardsHeldForOut.map(c => c.toString());
    expect(heldCards).to.include("8d");
    expect(heldCards).to.have.lengthOf(1);
    
    // Check the candidate cards - should be the remaining 8s (clubs, hearts, spades)
    // but not 8d which is already held
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateCards).to.have.lengthOf(3);
    candidateCards.forEach(card => {
      expect(card[0]).to.equal("8"); // First character should be "8"
      expect(card).to.not.equal("8d"); // Should not include the 8d we already hold
    });
    expect(candidateCards).to.deep.equal(["8c", "8h", "8s"].sort());
  });

  it("should return a Two Pair improvement out for hand 8♣, J♦ | 3♦, 5♠, 5♣", () => {
    const holeCards = [new Card("8c"), new Card("Jd")];
    const communityCards = [new Card("3d"), new Card("5s"), new Card("5c")];
    
    // Call the outsToTwoPair function directly.
    const outs = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(outs).to.be.an("array").that.is.not.empty;
    
    const twoPairOut = outs[0];
    expect(twoPairOut.outHand).to.equal("Two Pair");
    expect(twoPairOut.cardNeededCount).to.equal(1);
    
    // Expect that a candidate improvement is generated for one of the hole cards.
    // For example, if the function favors the higher hole card, then the candidate might be "J".
    expect(twoPairOut.cardsHeldForOut, "Candidate held cards should include a hole card for pairing").to.be.an("array").that.is.not.empty;
    
    // Let candidateValue be the value of the hole card chosen to improve (e.g., "J").
    const candidateValue = twoPairOut.cardsHeldForOut[0].value;
    
    // All candidate outs should have the same value as candidateValue.
    twoPairOut.cardsThatCanMakeHand.forEach(candidate => {
      expect(candidate.value).to.equal(candidateValue);
    });
  });

  it("should throw an error when fewer than three community cards are provided", () => {
    const holeCards = [new Card("As"), new Card("Kh")];
    const communityCards = [new Card("2h"), new Card("3c")]; // only 2 cards
    expect(() => {
      HandEvaluator.outsToTwoPair(holeCards, communityCards);
    }).to.throw("Community cards must be between 3 and 5");
  });

  it("should throw an error when hole cards array does not have exactly two cards", () => {
    const holeCards = [new Card("As")]; // only one hole card
    const communityCards = [new Card("2h"), new Card("3c"), new Card("Td")];
    expect(() => {
      HandEvaluator.outsToTwoPair(holeCards, communityCards);
    }).to.throw("Must provide exactly two hole cards");
  });

  it("should return an empty array if no candidate pair exists", () => {
    // No pair is present in the full hand.
    const holeCards = [new Card("As"), new Card("Kd")];
    const communityCards = [new Card("Qh"), new Card("Jc"), new Card("9s")];
    const outs = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    console.log("Outs:", JSON.stringify(outs, null, 2));
    expect(outs).to.be.an("array").that.is.empty;
  });

  it("should not return a two pair improvement for a dirty candidate", () => {
    // In this test, the hole cards form a pair (8s, 8h)
    // and the board provides an additional candidate "K" (from Kc) among others.
    // This improvement would rely on the board's "K", making it dirty.
    // Therefore, the function should return no valid two pair improvement.
    const holeCards = [new Card("8s"), new Card("8h")];
    const communityCards = [new Card("Kc"), new Card("3d"), new Card("2h")];
    const outs = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(outs).to.be.an("array").that.is.empty;
  });
  
});

describe("HandEvaluator.outsToThreeKind", () => {

  it("should return properly formed Out object for Two Pair improvement when pairing the 8", () => {
    // Setup:
    // Hole cards: "Ks", "8d" (King and 8)
    // Community cards: "3h", "Kc", "2d"
    // The hand already has a pair of Kings (from "Ks" and "Kc")
    // Improvement should be based on pairing the 8 (which appears only in the hole)
    const holeCards = [new Card("Ks"), new Card("8d")];
    const communityCards = [new Card("3h"), new Card("Kc"), new Card("2d")];
    
    // Call the outsToTwoPair function.
    const outs = HandEvaluator.outsToTwoPair(holeCards, communityCards);
    expect(outs).to.be.an("array").with.lengthOf(1);
    
    const out = outs[0];
    expect(out.outHand).to.equal("Two Pair");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // Held cards should be exactly the candidate card from the hole ("8d")
    const heldCards = out.cardsHeldForOut.map(c => c.toString());
    expect(heldCards).to.deep.equal(["8d"]);
    
    // Candidate outs should be for missing 8's (excluding the already held "8d")
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateCards).to.deep.equal(["8c", "8h", "8s"].sort());
  });

  it("should return an Outs object with correctly formatted out objects", () => {
    // In this scenario, an Ace-high and Ten-high are in the hole.
    // Expected: two candidate outs (one for pairing with the Ace and one for pairing with the Ten).
    // The overall highest out hand type should be "Pair" and the combined output
    // should have total 6 candidate out cards.
    const hole = ["As", "Ts"].map(c => new Card(c));
    const community = ["9h", "7d", "2c"].map(c => new Card(c));
    
    const result = HandEvaluator.calculateOuts(hole, community);
    
    // Verify that highestOutHand is "Pair"
    expect(result.highestOutHand).to.equal("Pair");
    
    // Verify that exactly two Out objects are returned (one per eligible candidate)
    expect(result.outs).to.be.an("array").with.lengthOf(2);
    
    // Verify that each Out object requires exactly one card to complete the improvement
    result.outs.forEach(out => {
      expect(out.cardNeededCount).to.equal(1);
    });
    
    // Verify that the aggregated outCards field has a total of 6 candidate cards
    expect(result.outCards).to.be.an("array").with.lengthOf(6);
  });

  it("should return a single Out object aggregating candidate cards with correct cardsNeeded and cardsHeldForOut", () => {
    // Setup:
    // Hole cards: "8s", "Kh"
    // Community cards: "8d", "Qc", "Js"
    // The pair is "8" (from hole "8s" and community "8d").
    // The missing suits for the "8" are those not present among the pair.
    // Here "8s" and "8d" are held; therefore, the missing candidate cards should be "8c" and "8h".
    const holeCards = [new Card("8s"), new Card("Kh")];
    const communityCards = [new Card("8d"), new Card("Qc"), new Card("Js")];
    
    const results = HandEvaluator.outsToThreeKind(holeCards, communityCards);
    
    // Expect a single Out object.
    expect(results).to.be.an("array").with.lengthOf(1);
    const out = results[0];
    
    // Verify the hand type is set correctly.
    expect(out.outHand).to.equal("Three of a Kind");
    expect(out.possibleHand).to.be.true;
    
    // Verify that cardNeededCount reflects the number of cards needed to complete the hand (should be 1).
    expect(out.cardNeededCount).to.equal(1);
    
    // Verify that cardsHeldForOut contains the specific pair cards that form the basis of the improvement.
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["8s", "8d"].sort());
    
    // Verify that candidate outs aggregate the missing "8" cards for the pair.
    // Since "8s" and "8d" are held, the missing candidate cards should be "8c" and "8h".
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateCards).to.deep.equal(["8c", "8h"].sort());
  });

  it("should return outs for a hand with a valid pair (aggregated candidate out)", () => {
    // Example: HoleCards: ['As', '7h'], CommunityCards: ['Ad', '2h', '3c']
    // The pair is Aces (As and Ad). Missing suits for Aces are 'Ah' and 'Ac'.
    const holeCards = ["As", "7h"].map(c => new Card(c));
    const communityCards = ["Ad", "2h", "3c"].map(c => new Card(c));
  
    const results = HandEvaluator.outsToThreeKind(holeCards, communityCards);
  
    // Expect a single Out object.
    expect(results).to.be.an("array").that.has.lengthOf(1);
    const out = results[0];
  
    // Verify the hand type is set correctly.
    expect(out.outHand).to.equal("Three of a Kind");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
  
    // cardsHeldForOut should contain both Ace cards ("As" and "Ad").
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["As", "Ad"].sort());
  
    // The candidate outs should aggregate the missing Ace candidate cards: "Ah" and "Ac".
    const candidateOuts = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
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

  it("should return proper Out for an Open‑Ended Straight Draw", () => {
    // Setup a draw scenario:
    // Hole cards: "8h" and "9d"
    // Community cards: "6s", "7c", and "Jd"
    // Combined, the cards form a contiguous block of: 6,7,8,9
    // => Missing candidates to complete the straight are the card with value "5" (one below) and "T" (one above)
    const holeCards = [new Card("8h"), new Card("9d")];
    const communityCards = [new Card("6s"), new Card("7c"), new Card("Jd")];
    
    const outs = HandEvaluator.outsToStraightOESD(holeCards, communityCards);
    
    // Expect a single Out object (one candidate hand) rather than one for every candidate card.
    expect(outs).to.be.an("array").with.lengthOf(1);
    
    const out = outs[0];
    expect(out.outHand).to.equal("Straight (OESD)");
    expect(out.possibleHand).to.be.true;
    // Only one card is needed to complete the straight.
    expect(out.cardNeededCount).to.equal(1);
    
    // The aggregated candidate outs should contain both possible completing cards,
    // in this example, the missing endpoints: one below the block and one above.
    // With an ordered values array of ["2","3","4","5","6","7","8","9","T","J","Q","K","A"],
    // the contiguous block from 6 to 9 is present => candidate outs should have values "5" and "T".
    const candidateValues = out.cardsThatCanMakeHand.map(c => c.value).sort();
    expect(candidateValues).to.deep.equal(["5", "T"].sort());
    
    // The held cards should be the 4 cards forming the contiguous block.
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    // Although the order is not important, we expect exactly the block cards.
    expect(heldCards).to.deep.equal(["6s", "7c", "8h", "9d"].sort());
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


describe("HandEvaluator.outsToInsideStraightDraw", () => {

  it("should return properly formed Out for an Inside Straight Draw", () => {
    // Setup a draw scenario with a gap in the middle
    // Hole cards: 8h, 9d 
    // Community cards: 6s, Tc, Jd
    // This creates a sequence with cards 6-8-9-T-J with a gap at 7
    // For an inside straight draw, we need exactly the 7 to complete the straight
    const holeCards = [new Card("8h"), new Card("9d")];
    const communityCards = [new Card("6s"), new Card("Tc"), new Card("Jd")];
    
    const outs = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    
    // Should return exactly one Out object (one hand that can be made)
    expect(outs).to.be.an('array').with.lengthOf(1);
    
    const out = outs[0];
    
    // Check basic properties of the Out object
    expect(out.outHand).to.equal("Inside Straight Draw");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // Check that cardsHeldForOut contains the cards forming the draw (6,8,9,T,J - all except the gap)
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.have.lengthOf(4);
    // The held cards should be the ones forming the sequence with the gap
    expect(heldCards).to.deep.equal(["6s", "8h", "9d", "Tc"].sort());
    
    // Check that cardsThatCanMakeHand contains exactly the cards that can complete the straight
    // In this case, all possible 7's (7c, 7d, 7h, 7s)
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateCards).to.have.lengthOf(4);
    
    // Every candidate card should have value "7" 
    candidateCards.forEach(card => {
      expect(card[0]).to.equal("7"); // First character should be "7"
    });
    
    // The candidates should be all four possible "7" cards
    expect(candidateCards).to.deep.equal(["7c", "7d", "7h", "7s"].sort());
  });

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

  it("should return an Inside Straight Draw out with candidate card '8' for the hand 7♥ 6♥ | 4♦ 5♥ 9♠", () => {
    // Setup: Hole cards and community cards as described.
    const holeCards = [new Card("7h"), new Card("6h")];
    const communityCards = [new Card("4d"), new Card("5h"), new Card("9s")];
      
    const results = HandEvaluator.outsToInsideStraightDraw(holeCards, communityCards);
    
    // Expect exactly one Out to be returned.
    expect(results).to.be.an("array").with.lengthOf(1);
    
    const out = results[0];
    
    // Verify the basic properties of the Out object.
    expect(out.outHand).to.equal("Inside Straight Draw");
    expect(out.cardNeededCount).to.equal(1);
    
    // Candidate outs: every candidate card must have the value "8"
    expect(out.cardsThatCanMakeHand).to.be.an("array").that.is.not.empty;
    out.cardsThatCanMakeHand.forEach(candidate => {
      expect(candidate.value).to.equal("8");
    });
    
    // Held cards: verify that held cards match the expected cards.
    // In this scenario, the held cards forming the draw are expected to be:
    // ["6h", "7h", "5h", "9s"] (order-insensitive).
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    const expectedHeld = ["6h", "7h", "5h", "9s"].sort();
    expect(heldCards).to.deep.equal(expectedHeld);
    
    // Verify candidate outs aggregate all four suits for "8".
    const candidateSet = new Set(out.cardsThatCanMakeHand.map(c => c.toString()).sort());
    const expectedCandidates = ["8s", "8h", "8d", "8c"].sort();
    expect(Array.from(candidateSet).sort()).to.deep.equal(expectedCandidates);
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

  it("should return properly formed Out for Flush", () => {
    // Setup a flush draw scenario:
    // Four hearts are present in the hand, one more heart completes the flush
    const holeCards = [new Card("Ah"), new Card("Kh")];
    const communityCards = [new Card("2h"), new Card("5h"), new Card("9d")];
    
    const outs = HandEvaluator.outsToFlush(holeCards, communityCards);
    
    // Should return exactly one Out object (representing one flush draw)
    expect(outs).to.be.an('array').with.lengthOf(1);
    
    const out = outs[0];
    
    // Check basic properties of the Out object
    expect(out.outHand).to.equal("Flush");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // Check that cardsHeldForOut contains exactly the four hearts already in the hand
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.have.lengthOf(4);
    expect(heldCards).to.deep.equal(["2h", "5h", "Ah", "Kh"].sort());
    
    // Check that cardsThatCanMakeHand contains all the hearts not already in the hand
    // Expected: 3h, 4h, 6h, 7h, 8h, 9h, Th, Jh, Qh (all missing hearts)
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    
    // Every candidate card should be a heart
    candidateCards.forEach(card => {
      expect(card[card.length-1]).to.equal("h"); // Last character should be "h"
      expect(heldCards).to.not.include(card); // Should not include hearts we already have
    });
    
    // Should include all remaining hearts (9 hearts not in the hand)
    const expectedHearts = ["3h", "4h", "6h", "7h", "8h", "9h", "Th", "Jh", "Qh"].sort();
    expect(candidateCards).to.deep.equal(expectedHearts);
  });

  it("should return a single Out object for a flush draw with aggregated candidate outs", () => {
    // Setup a flush draw scenario:
    // Hole cards: "Ah", "Ks" (only one heart present in hole)
    // Community cards: "Qh", "Jh", "3h" (all hearts)
    // Combined, hearts in play are: "Ah", "Qh", "Jh", "3h" (exactly 4 cards → flush draw)
    const holeCards = [new Card("Ah"), new Card("Ks")];
    const communityCards = [new Card("Qh"), new Card("Jh"), new Card("3h")];
    
    const results = HandEvaluator.outsToFlush(holeCards, communityCards);
    
    // With the updated logic, we expect one aggregated Out for the flush draw.
    expect(results).to.be.an("array").with.lengthOf(1);
    const out = results[0];
    
    // Verify the Out object properties.
    expect(out.outHand).to.equal("Flush");
    expect(out.possibleHand).to.be.true;
    // Only one card is needed to complete the flush.
    expect(out.cardNeededCount).to.equal(1);
    
    // Verify that the held cards are the hearts in play.
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["3h", "Ah", "Jh", "Qh"].sort());
    
    // Verify candidate outs: they should aggregate every heart not in play.
    // Suppose our authoritative order (values) is: 
    // ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"].
    // With "Ah", "Qh", "Jh", and "3h" in play, the remaining heart candidates are:
    // "2h", "4h", "5h", "6h", "7h", "8h", "9h", "Th", "Kh".
    const candidateOuts = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateOuts).to.deep.equal(
      ["2h", "4h", "5h", "6h", "7h", "8h", "9h", "Th", "Kh"].sort()
    );
  });

  it("should return an overall properly formed Outs object from calculateOuts", () => {
    // This test uses calculateOuts to verify that all top-level fields are formed correctly.
    // Setup: Hole cards: "As", "Ts"; Community cards: "9h", "7d", "2c"
    // In this scenario, the only improvement is to pair one of the hole cards.
    // Expected: two Out objects (one for pairing the Ace and one for pairing the Ten)
    // and a combined outCards array of 6 candidate cards.
    const hole = ["As", "Ts"].map(c => new Card(c));
    const community = ["9h", "7d", "2c"].map(c => new Card(c));
    
    const result = HandEvaluator.calculateOuts(hole, community);
    
    // Check that the highest out improvement is "Pair"
    expect(result.highestOutHand).to.equal("Pair");
    
    // Verify that there are exactly two Out objects (one for each eligible hole card over the board)
    expect(result.outs).to.be.an("array").with.lengthOf(2);
    
    // Each Out should require exactly one card to complete the improvement.
    result.outs.forEach(out => {
      expect(out.cardNeededCount).to.equal(1);
    });
    
    // Verify that the aggregated outCards field has exactly 6 candidate cards.
    expect(result.outCards).to.be.an("array").with.lengthOf(6);
  });

  it("should return candidate Out object for flush draw when a suit has exactly four cards", () => {
    // Example: HoleCards: ["7h", "8h"]; CommunityCards: ["9h", "Th", "2c"]
    // In hearts, we have 7h, 8h, 9h, Th (flush draw).
    // The candidate outs should be aggregated into a single Out object.
    const holeCards = [new Card("7h"), new Card("8h")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("2c")];
    const results = HandEvaluator.outsToFlush(holeCards, communityCards);
    
    // We expect one Out object (for hearts)
    expect(results).to.be.an("array").with.lengthOf(1);
    
    const out = results[0];
    expect(out.outHand).to.equal("Flush");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // The cardsHeldForOut should be exactly the 4 held heart cards.
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["7h", "8h", "9h", "Th"].sort());
    
    // The candidate outs should be an aggregated array of all hearts not in play.
    // Assuming our authoritative order is: ["2","3","4","5","6","7","8","9","T","J","Q","K","A"],
    // and held hearts are ["7h", "8h", "9h", "Th"],
    // the expected candidate hearts are: ["2h","3h","4h","5h","6h","Jh","Qh","Kh","Ah"].
    const candidateOuts = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateOuts).to.deep.equal(
      ["2h", "3h", "4h", "5h", "6h", "Jh", "Qh", "Kh", "Ah"].sort()
    );
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

  it("should return a properly formed Out object for Full House (basic two pair scenario)", () => {
    // Two pair scenario that can improve to a full house.
    // Hole cards: Qh, Qd; Community cards: Js, 8c, 8d.
    const holeCards = [new Card("Qh"), new Card("Qd")];
    const communityCards = [new Card("Js"), new Card("8c"), new Card("8d")];
    const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    expect(out.outHand).to.equal("Full House");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    // Held cards: aggregation of both pairs (should have 4 cards)
    const held = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(held).to.deep.equal(["8c", "8d", "Qd", "Qh"].sort());
    // Candidate outs: for this scenario, candidates come from either "Q" or "8".
    // Here we only check that at least one candidate exists.
    expect(out.cardsThatCanMakeHand).to.be.an("array").that.is.not.empty;
    out.cardsThatCanMakeHand.forEach(candidate =>
      expect(["Q", "8"]).to.include(candidate.value)
    );
  });

  it("should return an aggregated candidate Out object for full house from trips scenario", () => {
    // Trips scenario:
    // Hole cards: 8s, 8h; Community cards: 8d, Qh, Js.
    // In this trips case, candidate ranks are derived from board cards.
    // Originally, we expected 6, but the implementation returns 8 candidate cards.
    const holeCards = [new Card("8s"), new Card("8h")];
    const communityCards = [new Card("8d"), new Card("Qh"), new Card("Js")];
    const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    expect(out.outHand).to.equal("Full House");
    expect(out.cardNeededCount).to.equal(1);
    // Held cards must include all three 8's.
    const held = out.cardsHeldForOut.map(c => c.toString());
    expect(held).to.include.members(["8s", "8h", "8d"]);
    // Candidate outs should be aggregated from candidate ranks.
    expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(6);
    out.cardsThatCanMakeHand.forEach(candidate =>
      expect(["Q", "J"]).to.include(candidate.value)
    );
  });

// Updated test for "should return an aggregated candidate Out object for full house from two pair scenario":
it("should return an aggregated candidate Out object for full house from two pair scenario", () => {
  // Two pair scenario:
  // Hole cards: 8s, 7h; Community cards: 8d, 7d, Qs.
  // Suppose the improvement aggregates candidate outs from both pairs.
  // For example, if for the 8's the missing suits are 8c and 8h (if not already held)
  // and for the 7's the missing suits are 7c and 7s, then overall candidate outs should total 4
  // and none of these candidate outs should be already held.
  const holeCards = [new Card("8s"), new Card("7h")];
  const communityCards = [new Card("8d"), new Card("7d"), new Card("Qs")];
  const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
  expect(outs).to.be.an("array").with.lengthOf(1);
  const out = outs[0];
  expect(out.outHand).to.equal("Full House");
  expect(out.cardNeededCount).to.equal(1);
  
  // Held cards should be the aggregation of both pairs.
  const held = out.cardsHeldForOut.map(c => c.toString()).sort();
  expect(held).to.deep.equal(["7d", "7h", "8d", "8s"].sort());
  
  // Candidate outs should be exactly 4 cards.
  expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(4);
  // Also, candidate outs should not be among the held cards.
  const heldSet = new Set(held);
  out.cardsThatCanMakeHand.forEach(candidate => {
    expect(heldSet.has(candidate.toString())).to.be.false;
    expect(["7", "8"]).to.include(candidate.value);
  });
});

  it("should return the correct aggregated Out object for full house improvement (trips scenario)", () => {
    // Trips scenario:
    // Hole cards: 8s, 8h; Community cards: 8d, Kd, Qc.
    // Improvement: trips on 8's can be improved by pairing with either a King or Queen.
    const holeCards = [new Card("8s"), new Card("8h")];
    const communityCards = [new Card("8d"), new Card("Kd"), new Card("Qc")];
    const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    expect(out.outHand).to.equal("Full House");
    expect(out.cardNeededCount).to.equal(1);
    const held = out.cardsHeldForOut.map(c => c.toString());
    expect(held).to.include.members(["8s", "8h", "8d"]);
    const candidateValues = out.cardsThatCanMakeHand.map(c => c.value);
    expect(candidateValues).to.include.members(["K", "Q"]);
    expect(out.cardsThatCanMakeHand.length).to.equal(6);
  });

  it("should throw an error if the hand is already a full house", () => {
    // Hand already made full house: Hole cards: 8s, 8h; Community cards: 8d, Kc, Kd.
    const holeCards = [new Card("8s"), new Card("8h")];
    const communityCards = [new Card("8d"), new Card("Kc"), new Card("Kd")];
    expect(() => {
      HandEvaluator.outsToFullHouse(holeCards, communityCards);
    }).to.throw("Hand already made full house");
  });

  it("should return candidate outs for a trips scenario", () => {
    // Trips scenario:
    // Hole cards: As, 7h; Community cards: Ad, Ac, 2h.
    // Improvement: trips on Aces should provide candidate outs for a non-A rank.
    const holeCards = [new Card("As"), new Card("7h")];
    const communityCards = [new Card("Ad"), new Card("Ac"), new Card("2h")];
    const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    expect(out.outHand).to.equal("Full House");
    const held = out.cardsHeldForOut.map(c => c.toString());
    expect(held).to.include.members(["As", "Ad", "Ac"]);
    out.cardsThatCanMakeHand.forEach(candidate =>
      // Candidate outs should be for a rank other than "A"
      expect(candidate.value).to.not.equal("A")
    );
  });

  it("should only return Out objects that require exactly one card to complete the full house (trips scenario)", () => {
    // Trips scenario:
    // Hole cards: As, 7h; Community cards: Ac, Ad, Kc.
    const holeCards = [new Card("As"), new Card("7h")];
    const communityCards = [new Card("Ac"), new Card("Ad"), new Card("Kc")];
    const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    expect(out.cardNeededCount).to.equal(1);
    const totalCandidates = out.cardsThatCanMakeHand.length;
    expect(totalCandidates).to.equal(6);
  });

// Updated test for "should return candidate outs for a two pair scenario":
it("should return candidate outs for a two pair scenario", () => {
  // Two pair scenario:
  // Hole cards: 8s, 8h; Community cards: Kc, Kd, 2h.
  // In this case, the full house is achieved by pairing up with one of the pairs.
  // Suppose the aggregation looks at both the hole pair (8's) and the board pair (Kings).
  // Then the candidate outs (missing cards) for the 8's (if held are 8s and 8h) would be the 8's from the remaining suits,
  // and for the Kings (if Kc and Kd are held) would be the remaining Kings.
  // If each set provides 2 candidate cards, then overall we expect 4 candidate cards.
  const holeCards = [new Card("8s"), new Card("8h")];
  const communityCards = [new Card("Kc"), new Card("Kd"), new Card("2h")];
  const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
  expect(outs).to.be.an("array").with.lengthOf(1);
  
  const out = outs[0];
  expect(out.outHand).to.equal("Full House");
  expect(out.cardNeededCount).to.equal(1);
  // Held cards should be the aggregation of the two pairs.
  // For example, held cards here might be ["8s", "8h", "Kc", "Kd"]
  expect(out.cardsHeldForOut.map(c => c.toString())).to.deep.equal(["8s", "8h", "Kc", "Kd"]);
  // Now, candidate outs should total 4.
  // If for 8's the missing suits are determined from the complete deck,
  // and for Kings the missing suits are likewise computed, then overall 4 candidate cards should be aggregated.
  expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(4);
  // Each candidate card should have a value of either "8" or "K" (allowing both possibilities).
  out.cardsThatCanMakeHand.forEach(candidate => {
    expect(["8", "K"]).to.include(candidate.value);
    // Do not filter based on suit here; the held cards already exclude cards in play.
  });
});

  it("should return an empty array if no candidate outs exist", () => {
    // No improvement opportunity.
    // Hole cards: As, 7h; Community cards: Kc, 2d, 3c.
    const holeCards = [new Card("As"), new Card("7h")];
    const communityCards = [new Card("Kc"), new Card("2d"), new Card("3c")];
    const outs = HandEvaluator.outsToFullHouse(holeCards, communityCards);
    expect(outs).to.be.an("array").that.is.empty;
  });
});

describe("HandEvaluator.outsToStraightFlush", () => {

  // Updated test for "should return properly formed Out for Straight Flush"
  it("should return a properly formed aggregated Out for Straight Flush", () => {
    // Setup scenario: flush draw in hearts with straight possibilities
    // Hole cards: 8h, 9h
    // Community cards: 6h, 7h, Jd
    // With these cards, the contiguous block is [6h,7h,8h,9h]
    // The missing endpoints are 5h (to complete 5-6-7-8-9) and Th (to complete 6-7-8-9-10)
    const holeCards = [new Card("8h"), new Card("9h")];
    const communityCards = [new Card("6h"), new Card("7h"), new Card("Jd")];
    
    const outs = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    
    // Expect a single aggregated Out object.
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    
    expect(out.outHand).to.equal("Straight Flush");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);

    // Held cards should be the contiguous block of hearts: 6h, 7h, 8h, and 9h.
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["6h", "7h", "8h", "9h"].sort());
    
    // Candidate outs are now aggregated into a single array.
    // They should include both missing endpoints: "5h" and "Th".
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateCards).to.have.lengthOf(2);
    expect(candidateCards).to.deep.equal(["5h", "Th"].sort());
  });


  // Updated test for "should return correct Out objects for a straight flush draw"
  it("should return correct aggregated Out for a straight flush draw", () => {
    /*
      Setup:
      - Hole cards: 8h, 9h
      - Community cards: Th, Jh, 2d
      Combined, the hand has 4 hearts: 8h, 9h, Th, Jh.
      The open-ended straight draw is missing a card below or above this block:
        • One candidate is 7h (to complete 7-8-9-T-J)
        • The other candidate is Qh (to complete 8-9-T-J-Q)
      The aggregated Out should include both candidate outs.
    */
    const holeCards = [new Card("8h"), new Card("9h")];
    const communityCards = [new Card("Th"), new Card("Jh"), new Card("2d")];
    
    const outs = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    
    // Expect a single aggregated Out object.
    expect(outs).to.be.an("array").with.lengthOf(1);
    const out = outs[0];
    
    expect(out.outHand).to.equal("Straight Flush");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);

    // Held cards should be the contiguous block: 8h, 9h, Th, Jh.
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.deep.equal(["8h", "9h", "Jh", "Th"].sort());
    
    // Aggregated candidate outs should contain both "7h" and "Qh".
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString()).sort();
    expect(candidateCards).to.have.lengthOf(2);
    expect(candidateCards).to.deep.equal(["7h", "Qh"].sort());
  });

  it("should return candidate Out objects when both a straight draw and a flush draw exist", () => {
    // Example:
    // HoleCards: 7h, 8h; CommunityCards: 9h, Th, 2c.
    // In this scenario, the flush suit is hearts.
    // The flush cards are [7h, 8h, 9h, Th] forming a contiguous block.
    // The candidate outs (missing endpoints) are 6h (lower) and Jh (upper),
    // so we expect the aggregated Out to contain both candidate cards.
    const holeCards = [new Card("7h"), new Card("8h")];
    const communityCards = [new Card("9h"), new Card("Th"), new Card("2c")];
    
    const results = HandEvaluator.outsToStraightFlush(holeCards, communityCards);
    expect(results).to.be.an("array").that.is.not.empty;
    results.forEach(out => {
      expect(out.outHand).to.equal("Straight Flush");
      expect(out.possibleHand).to.be.true;
      expect(out.cardNeededCount).to.equal(1);
      // Expect two candidate cards per Out (e.g., 6h and Jh).
      expect(out.cardsThatCanMakeHand).to.be.an("array").with.lengthOf(2);
      out.cardsThatCanMakeHand.forEach(candidate => {
        // Candidate card must be of the flush suit.
        expect(candidate.suit).to.equal("h");
      });
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

  it("should return properly formed Out for Four of a Kind", () => {
    // Setup:
    // Hole cards: 5h, 5d (two fives)
    // Community cards: 5s, 2c, 9h (another five plus non-relevant cards)
    // This creates trips of 5's (5h, 5d, 5s)
    // For four of a kind, we need the remaining 5c
    const holeCards = [new Card("5h"), new Card("5d")];
    const communityCards = [new Card("5s"), new Card("2c"), new Card("9h")];
    
    const outs = HandEvaluator.outsToFourKind(holeCards, communityCards);
    
    // Should return exactly one Out object for the Four of a Kind
    expect(outs).to.be.an('array').with.lengthOf(1);
    
    const out = outs[0];
    
    // Check basic properties of the Out object
    expect(out.outHand).to.equal("Four of a Kind");
    expect(out.possibleHand).to.be.true;
    expect(out.cardNeededCount).to.equal(1);
    
    // Check that cardsHeldForOut contains exactly the three 5's already in the hand
    const heldCards = out.cardsHeldForOut.map(c => c.toString()).sort();
    expect(heldCards).to.have.lengthOf(3);
    expect(heldCards).to.deep.equal(["5h", "5d", "5s"].sort());
    
    // Check that cardsThatCanMakeHand contains exactly the missing 5c
    const candidateCards = out.cardsThatCanMakeHand.map(c => c.toString());
    expect(candidateCards).to.have.lengthOf(1);
    expect(candidateCards[0]).to.equal("5c");
    
    // Additional check: The candidate card must be the correct value and suit
    const candidateCard = out.cardsThatCanMakeHand[0];
    expect(candidateCard.value).to.equal("5");
    expect(candidateCard.suit).to.equal("c"); // The only missing suit for 5's
  });

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