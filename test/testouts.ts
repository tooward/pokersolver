import { expect } from 'chai';
import { Card, Hand, Game } from 'tooward-pokersolver';
import HandEvaluator, { Out } from '../coach/outs';

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

describe('outsToPair', () => {

  it('should identify outs to pair the lower hole card', () => {
    const holeCards = ['As', '7h'].map(c => new Card(c));
    const communityCards = ['2h', '3c', 'Td'].map(c => new Card(c));
    
    const result = HandEvaluator.outsToPair(holeCards, communityCards);
    
    expect(result.possibleHand).to.be.true;
    expect(result.outHand).to.equal('Pair');
    
    // Should include outs for both hole cards
    expect(result.cardsNeeded.length).to.equal(6); // Ac, Ad, Ah + 7c, 7d, 7s
    expect(result.cardNeededCount).to.equal(6);
  });

  it('should not identify outs when already have a pair of hole cards', () => {
    const holeCards = ['As', 'Ah'].map(c => new Card(c));
    const communityCards = ['2h', '3c', 'Td'].map(c => new Card(c));
    
    const result = HandEvaluator.outsToPair(holeCards, communityCards);
    
    expect(result.possibleHand).to.be.false;
    expect(result.cardNeededCount).to.equal(0);
    expect(result.cardsNeeded.length).to.equal(0);
  });

  it('should not identify outs when community cards pair with a hole card', () => {
    const holeCards = ['As', 'Kh'].map(c => new Card(c));
    const communityCards = ['Ah', '3c', 'Td'].map(c => new Card(c));
    
    const result = HandEvaluator.outsToPair(holeCards, communityCards);
    
    expect(result.possibleHand).to.be.false;
    expect(result.cardNeededCount).to.equal(0);
    expect(result.cardsNeeded.length).to.equal(0);
  });

  it('should correctly identify outs with missing suits', () => {
    const holeCards = ['As', 'Kh'].map(c => new Card(c));
    const communityCards = ['Ah', '3c', 'Td'].map(c => new Card(c));
    
    // We already have As and Ah, so Ac and Ad are the only outs
    const result = HandEvaluator.outsToPair(holeCards, communityCards);
    
    expect(result.possibleHand).to.be.false; // Already have a pair
    expect(result.cardsNeeded.length).to.equal(0);
  });

  it('should throw an error when fewer than 2 hole cards are provided', () => {
    const holeCards = ['As'].map(c => new Card(c));
    const communityCards = ['2h', '3c', 'Td'].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator. outsToPair(holeCards, communityCards);
    }).to.throw('Must provide two hole cards');
  });

  it('should throw an error when fewer than 3 community cards are provided', () => {
    const holeCards = ['As', 'Kh'].map(c => new Card(c));
    const communityCards = ['2h', '3c'].map(c => new Card(c));
    
    expect(() => {
      HandEvaluator.outsToPair(holeCards, communityCards);
    }).to.throw('Must provide at least three community cards');
  });

  it('should handle when a community card would complete a pair for both hole cards', () => {
    const holeCards = ['As', '2h'].map(c => new Card(c));
    const communityCards = ['Kh', 'Qc', '3d'].map(c => new Card(c));
    
    const result = HandEvaluator.outsToPair(holeCards, communityCards);
    
    expect(result.possibleHand).to.be.true;
    expect(result.cardsNeeded.length).to.equal(6); // 3 for Ace, 3 for 2
  });
});

describe('HandEvaluator.checkForInsideStraightDraw', () => {
  it('should return an Out object with proper fields for an inside straight draw', () => {
    const cards = [
      new Card('5h'),
      new Card('6d'),
      new Card('8s'),
      new Card('9c')
    ];
    const result = HandEvaluator.checkForInsideStraightDraw(cards);

    expect(result).to.be.an.instanceof(Out);
    expect(result.outHand).to.equal('Inside Straight Draw');
    expect(result.possibleHand).to.be.true;
    expect(result.cardNeededCount).to.be.greaterThan(0);
    expect(result.cardsNeeded.length).to.equal(result.cardNeededCount);

    // Verify that the missing cards are all 7s
    const allSevens = result.cardsNeeded.every(card => card.value === '7');
    expect(allSevens).to.be.true;
  });

  it('should identify an inside straight draw with Ace as low', () => {
    const cards = [
      new Card('Ah'),
      new Card('2d'),
      new Card('3s'),
      new Card('5c')
    ];
    const result = HandEvaluator.checkForInsideStraightDraw(cards);

    expect(result.possibleHand).to.be.true;
    // Expected missing card is a 4 in any suit
    expect(result.cardsNeeded.every(card => card.value === '4')).to.be.true;
  });

  it('should identify an inside straight draw with Ace as high', () => {
    const cards = [
      new Card('Th'),
      new Card('Jd'),
      new Card('Qs'),
      new Card('Ac')
    ];
    const result = HandEvaluator.checkForInsideStraightDraw(cards);

    expect(result.possibleHand).to.be.true;
    // Expected missing card is a K in any suit
    expect(result.cardsNeeded.every(card => card.value === 'K')).to.be.true;
  });

  it('should handle no inside straight draw found', () => {
    const cards = [
      new Card('2h'),
      new Card('5d'),
      new Card('9s'),
      new Card('Jc')
    ];
    const result = HandEvaluator.checkForInsideStraightDraw(cards);

    expect(result.possibleHand).to.be.false;
    expect(result.cardNeededCount).to.equal(0);
    expect(result.cardsNeeded).to.deep.equal([]);
  });

  it('should exclude cards already in play when finding outs', () => {
    const cards = [
      new Card('5h'),
      new Card('6d'),
      new Card('8s'),
      new Card('9c'),
      new Card('7h') // 7 of hearts already in play
    ];
    const result = HandEvaluator.checkForInsideStraightDraw(cards);

    // The result should not include the 7h since it's already in play
    expect(result.cardsNeeded.some(card => card.value === '7' && card.suit === 'h')).to.be.false;
    // But it should include at least one other 7
    expect(result.cardsNeeded.some(card => card.value === '7' && card.suit !== 'h')).to.be.true;
  });

  it('should throw an error if fewer than 4 cards are provided', () => {
    const cards = [
      new Card('Ah'),
      new Card('Kd'),
      new Card('Qs')
    ];
    expect(() => {
      HandEvaluator.checkForInsideStraightDraw(cards);
    }).to.throw("At least four cards are required to check for an inside straight draw");
  });
});
