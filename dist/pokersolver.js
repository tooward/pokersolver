"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaiGowPokerHelper = exports.Game = exports.HighCard = exports.OnePair = exports.TwoPair = exports.ThreePair = exports.ThreeOfAKind = exports.TwoThreeOfAKind = exports.Straight = exports.Flush = exports.FullHouse = exports.ThreeOfAKindTwoPair = exports.FourWilds = exports.FourOfAKind = exports.FourOfAKindPairPlus = exports.FiveOfAKind = exports.WildRoyalFlush = exports.NaturalRoyalFlush = exports.RoyalFlush = exports.StraightFlush = exports.Hand = exports.Card = exports.values = exports.HandEvaluator = void 0;
var outs_1 = require("./outs");
Object.defineProperty(exports, "HandEvaluator", { enumerable: true, get: function () { return __importDefault(outs_1).default; } });
// NOTE: The 'joker' will be denoted with a value of 'O' and any suit.
exports.values = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "T",
    "J",
    "Q",
    "K",
    "A",
];
// --------------------------
// Card class
// --------------------------
class Card {
    constructor(str) {
        this.value = str.substr(0, 1);
        this.suit = str.substr(1, 1).toLowerCase();
        this.rank = exports.values.indexOf(this.value);
        this.wildValue = str.substr(0, 1);
    }
    toString() {
        return this.wildValue.replace("T", "10") + this.suit;
    }
    static sort(a, b) {
        if (a.rank > b.rank) {
            return -1;
        }
        else if (a.rank < b.rank) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
exports.Card = Card;
// --------------------------
// Abstract Hand class
// --------------------------
class Hand {
    constructor(cards, name, game, canDisqualify) {
        this.cardPool = [];
        this.cards = [];
        this.suits = {};
        this.values = [];
        this.wilds = [];
        this.sfLength = 0;
        this.alwaysQualifies = true;
        this.descr = "";
        this.name = name;
        this.game = game;
        if (canDisqualify && this.game.lowestQualified) {
            this.alwaysQualifies = false;
        }
        // Ensure no duplicate cards in standard game.
        if (this.game.descr === "standard" &&
            new Set(cards).size !== cards.length) {
            throw new Error("Duplicate cards");
        }
        // Get rank based on game.
        const handRank = this.game.handValues.length;
        let i;
        for (i = 0; i < this.game.handValues.length; i++) {
            if (this.game.handValues[i] === this.constructor) {
                break;
            }
        }
        this.rank = handRank - i;
        // Set up the pool of cards.
        this.cardPool = cards.map((c) => typeof c === "string" ? new Card(c) : c);
        // Fix the card ranks for wild cards, and sort.
        for (let i = 0; i < this.cardPool.length; i++) {
            let card = this.cardPool[i];
            if (card.value === this.game.wildValue) {
                card.rank = -1;
            }
        }
        this.cardPool = this.cardPool.sort(Card.sort);
        // Create the arrays of suits and values.
        for (const card of this.cardPool) {
            if (card.rank === -1) {
                this.wilds.push(card);
            }
            else {
                if (!this.suits[card.suit]) {
                    this.suits[card.suit] = [];
                }
                if (!this.values[card.rank]) {
                    this.values[card.rank] = [];
                }
                this.suits[card.suit].push(card);
                this.values[card.rank].push(card);
            }
        }
        this.values.reverse();
        this.isPossible = this.solve();
    }
    compare(a) {
        if (this.rank < a.rank) {
            return 1;
        }
        else if (this.rank > a.rank) {
            return -1;
        }
        let result = 0;
        for (let i = 0; i <= 4; i++) {
            if (this.cards[i] &&
                a.cards[i] &&
                this.cards[i].rank < a.cards[i].rank) {
                result = 1;
                break;
            }
            else if (this.cards[i] &&
                a.cards[i] &&
                this.cards[i].rank > a.cards[i].rank) {
                result = -1;
                break;
            }
        }
        return result;
    }
    loseTo(hand) {
        return this.compare(hand) > 0;
    }
    getNumCardsByRank(val) {
        let cards = this.values[val];
        let checkCardsLength = cards ? cards.length : 0;
        for (let i = 0; i < this.wilds.length; i++) {
            if (this.wilds[i].rank > -1) {
                continue;
            }
            else if (cards) {
                if (this.game.wildStatus === 1 ||
                    cards[0].rank === exports.values.length - 1) {
                    checkCardsLength += 1;
                }
            }
            else if (this.game.wildStatus === 1 || val === exports.values.length - 1) {
                checkCardsLength += 1;
            }
        }
        return checkCardsLength;
    }
    getCardsForFlush(suit, setRanks) {
        let cards = (this.suits[suit] || []).slice().sort(Card.sort);
        for (let i = 0; i < this.wilds.length; i++) {
            let wild = this.wilds[i];
            if (setRanks) {
                let j = 0;
                while (j < exports.values.length && j < cards.length) {
                    if (cards[j].rank === exports.values.length - 1 - j) {
                        j++;
                    }
                    else {
                        break;
                    }
                }
                wild.rank = exports.values.length - 1 - j;
                wild.wildValue = exports.values[wild.rank];
            }
            cards.push(wild);
            cards = cards.sort(Card.sort);
        }
        return cards;
    }
    resetWildCards() {
        for (let i = 0; i < this.wilds.length; i++) {
            this.wilds[i].rank = -1;
            this.wilds[i].wildValue = this.wilds[i].value;
        }
    }
    nextHighest() {
        const excluding = this.cards.slice();
        let picks = this.cardPool.filter((card) => excluding.indexOf(card) < 0);
        if (this.game.wildStatus === 0) {
            for (let i = 0; i < picks.length; i++) {
                let card = picks[i];
                if (card.rank === -1) {
                    card.wildValue = "A";
                    card.rank = exports.values.length - 1;
                }
            }
            picks = picks.sort(Card.sort);
        }
        return picks;
    }
    toString() {
        return this.cards.map((c) => c.toString()).join(", ");
    }
    toArray() {
        return this.cards.map((c) => c.toString());
    }
    qualifiesHigh() {
        if (!this.game.lowestQualified || this.alwaysQualifies) {
            return true;
        }
        return (this.compare(Hand.solve(this.game.lowestQualified, this.game)) <= 0);
    }
    static winners(hands) {
        hands = hands.filter((h) => h.qualifiesHigh());
        const highestRank = Math.max(...hands.map((h) => h.rank));
        hands = hands.filter((h) => h.rank === highestRank);
        hands = hands.filter((h) => {
            let lose = false;
            for (let i = 0; i < hands.length; i++) {
                lose = h.loseTo(hands[i]);
                if (lose) {
                    break;
                }
            }
            return !lose;
        });
        return hands;
    }
    static solve(cards, game, canDisqualify = false) {
        game = typeof game === "string" ? new Game(game) : game;
        cards = cards || [""];
        const hands = game.handValues;
        let result = null;
        for (let i = 0; i < hands.length; i++) {
            result = new hands[i](cards, game, canDisqualify); // game.descr, 
            if (result.isPossible) {
                break;
            }
        }
        return result;
    }
    static stripWilds(cards, game) {
        const wilds = [];
        const nonWilds = [];
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (card.rank === -1) {
                wilds.push(card);
            }
            else {
                nonWilds.push(card);
            }
        }
        return [wilds, nonWilds];
    }
}
exports.Hand = Hand;
// --------------------------
// Subclasses of Hand
// --------------------------
class StraightFlush extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Straight Flush", game, canDisqualify);
    }
    solve() {
        let possibleStraight = null;
        let nonCards = [];
        this.resetWildCards();
        for (const suit in this.suits) {
            const cards = this.getCardsForFlush(suit, false);
            if (cards && cards.length >= this.game.sfQualify) {
                possibleStraight = cards;
                break;
            }
        }
        if (possibleStraight) {
            if (this.game.descr !== "standard") {
                for (const suit in this.suits) {
                    if (possibleStraight[0].suit !== suit) {
                        nonCards = nonCards.concat(this.suits[suit] || []);
                        nonCards = Hand.stripWilds(nonCards, this.game)[1];
                    }
                }
            }
            const straight = new Straight(possibleStraight, this.game, false);
            if (straight.isPossible) {
                this.cards = straight.cards;
                this.cards = this.cards.concat(nonCards);
                this.sfLength = straight.sfLength;
            }
        }
        if (this.cards[0] && this.cards[0].rank === 13) {
            this.descr = "Royal Flush";
        }
        else if (this.cards.length >= this.game.sfQualify) {
            // Use the suit from the first card as a fallback.
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    this.cards[0].suit +
                    " High";
        }
        return this.cards.length >= this.game.sfQualify;
    }
}
exports.StraightFlush = StraightFlush;
class RoyalFlush extends StraightFlush {
    constructor(cards, game, canDisqualify = false) {
        super(cards, game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        const result = super.solve();
        return result && this.descr === "Royal Flush";
    }
}
exports.RoyalFlush = RoyalFlush;
class NaturalRoyalFlush extends RoyalFlush {
    constructor(cards, game, canDisqualify = false) {
        super(cards, game, canDisqualify);
    }
    solve() {
        let i = 0;
        this.resetWildCards();
        let result = super.solve();
        if (result && this.cards) {
            for (i = 0; i < this.game.sfQualify && i < this.cards.length; i++) {
                if (this.cards[i].value === this.game.wildValue) {
                    result = false;
                    this.descr = "Wild Royal Flush";
                    break;
                }
            }
            if (i === this.game.sfQualify) {
                this.descr = "Royal Flush";
            }
        }
        return result;
    }
}
exports.NaturalRoyalFlush = NaturalRoyalFlush;
class WildRoyalFlush extends RoyalFlush {
    constructor(cards, game, canDisqualify = false) {
        super(cards, game, canDisqualify);
    }
    solve() {
        let i = 0;
        this.resetWildCards();
        let result = super.solve();
        if (result && this.cards) {
            for (i = 0; i < this.game.sfQualify && i < this.cards.length; i++) {
                if (this.cards[i].value === this.game.wildValue) {
                    this.descr = "Wild Royal Flush";
                    break;
                }
            }
            if (i === this.game.sfQualify) {
                result = false;
                this.descr = "Royal Flush";
            }
        }
        return result;
    }
}
exports.WildRoyalFlush = WildRoyalFlush;
class FiveOfAKind extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Five of a Kind", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 5) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 5; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 5));
                break;
            }
        }
        if (this.cards.length >= 5) {
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    "'s";
        }
        return this.cards.length >= 5;
    }
}
exports.FiveOfAKind = FiveOfAKind;
class FourOfAKindPairPlus extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Four of a Kind with Pair or Better", game, canDisqualify);
    }
    solve() {
        let cardsArr;
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 4) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 4; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                break;
            }
        }
        if (this.cards.length === 4) {
            for (let i = 0; i < this.values.length; i++) {
                cardsArr = this.values[i];
                if (cardsArr && this.cards[0].wildValue === cardsArr[0].wildValue) {
                    continue;
                }
                if (this.getNumCardsByRank(i) >= 2) {
                    this.cards = this.cards.concat(cardsArr || []);
                    for (let j = 0; j < this.wilds.length; j++) {
                        const wild = this.wilds[j];
                        if (wild.rank !== -1) {
                            continue;
                        }
                        if (cardsArr && cardsArr[0]) {
                            wild.rank = cardsArr[0].rank;
                        }
                        else if (this.cards[0].rank === exports.values.length - 1 &&
                            this.game.wildStatus === 1) {
                            wild.rank = exports.values.length - 2;
                        }
                        else {
                            wild.rank = exports.values.length - 1;
                        }
                        wild.wildValue = exports.values[wild.rank];
                        this.cards.push(wild);
                    }
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 6));
                    break;
                }
            }
        }
        if (this.cards.length >= 6) {
            const type = this.cards[0].toString().slice(0, -1) +
                "'s over " +
                this.cards[4].toString().slice(0, -1) +
                "'s";
            this.descr = this.name + ", " + type;
        }
        return this.cards.length >= 6;
    }
}
exports.FourOfAKindPairPlus = FourOfAKindPairPlus;
class FourOfAKind extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Four of a Kind", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 4) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 4; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 4));
                break;
            }
        }
        if (this.cards.length >= 4) {
            if (this.game.noKickers) {
                this.cards.length = 4;
            }
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    "'s";
        }
        return this.cards.length >= 4;
    }
}
exports.FourOfAKind = FourOfAKind;
class FourWilds extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Four Wild Cards", game, canDisqualify);
    }
    solve() {
        if (this.wilds.length === 4) {
            this.cards = this.wilds.slice();
            this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 4));
        }
        if (this.cards.length >= 4) {
            if (this.game.noKickers) {
                this.cards.length = 4;
            }
            this.descr = this.name;
        }
        return this.cards.length >= 4;
    }
}
exports.FourWilds = FourWilds;
class ThreeOfAKindTwoPair extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Three of a Kind with Two Pair", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 3) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                break;
            }
        }
        if (this.cards.length === 3) {
            for (let i = 0; i < this.values.length; i++) {
                const cardsArr = this.values[i];
                if (cardsArr && this.cards[0].wildValue === cardsArr[0].wildValue) {
                    continue;
                }
                if (this.cards.length > 5 && this.getNumCardsByRank(i) === 2) {
                    this.cards = this.cards.concat(cardsArr || []);
                    for (let j = 0; j < this.wilds.length; j++) {
                        const wild = this.wilds[j];
                        if (wild.rank !== -1)
                            continue;
                        if (cardsArr && cardsArr[0]) {
                            wild.rank = cardsArr[0].rank;
                        }
                        else if (this.cards[0].rank === exports.values.length - 1 &&
                            this.game.wildStatus === 1) {
                            wild.rank = exports.values.length - 2;
                        }
                        else {
                            wild.rank = exports.values.length - 1;
                        }
                        wild.wildValue = exports.values[wild.rank];
                        this.cards.push(wild);
                    }
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 4));
                    break;
                }
                else if (this.getNumCardsByRank(i) === 2) {
                    this.cards = this.cards.concat(cardsArr);
                    for (let j = 0; j < this.wilds.length; j++) {
                        const wild = this.wilds[j];
                        if (wild.rank !== -1)
                            continue;
                        if (cardsArr && cardsArr[0]) {
                            wild.rank = cardsArr[0].rank;
                        }
                        else if (this.cards[0].rank === exports.values.length - 1 &&
                            this.game.wildStatus === 1) {
                            wild.rank = exports.values.length - 2;
                        }
                        else {
                            wild.rank = exports.values.length - 1;
                        }
                        wild.wildValue = exports.values[wild.rank];
                        this.cards.push(wild);
                    }
                }
            }
        }
        if (this.cards.length >= 7) {
            const type = this.cards[0].toString().slice(0, -1) +
                "'s over " +
                this.cards[3].toString().slice(0, -1) +
                "'s & " +
                this.cards[5].value +
                "'s";
            this.descr = this.name + ", " + type;
        }
        return this.cards.length >= 7;
    }
}
exports.ThreeOfAKindTwoPair = ThreeOfAKindTwoPair;
class FullHouse extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Full House", game, canDisqualify);
    }
    solve() {
        let cardsArr;
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 3) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                break;
            }
        }
        if (this.cards.length === 3) {
            for (let i = 0; i < this.values.length; i++) {
                cardsArr = this.values[i];
                if (cardsArr && this.cards[0].wildValue === cardsArr[0].wildValue) {
                    continue;
                }
                if (this.getNumCardsByRank(i) >= 2) {
                    this.cards = this.cards.concat(cardsArr || []);
                    for (let j = 0; j < this.wilds.length; j++) {
                        const wild = this.wilds[j];
                        if (wild.rank !== -1)
                            continue;
                        if (cardsArr && cardsArr[0]) {
                            wild.rank = cardsArr[0].rank;
                        }
                        else if (this.cards[0].rank === exports.values.length - 1 &&
                            this.game.wildStatus === 1) {
                            wild.rank = exports.values.length - 2;
                        }
                        else {
                            wild.rank = exports.values.length - 1;
                        }
                        wild.wildValue = exports.values[wild.rank];
                        this.cards.push(wild);
                    }
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 5));
                    break;
                }
            }
        }
        if (this.cards.length >= 5) {
            const type = this.cards[0].toString().slice(0, -1) +
                "'s over " +
                this.cards[3].toString().slice(0, -1) +
                "'s";
            this.descr = this.name + ", " + type;
        }
        return this.cards.length >= 5;
    }
}
exports.FullHouse = FullHouse;
class Flush extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Flush", game, canDisqualify);
    }
    solve() {
        this.sfLength = 0;
        this.resetWildCards();
        for (const suit in this.suits) {
            const cards = this.getCardsForFlush(suit, true);
            if (cards.length >= this.game.sfQualify) {
                this.cards = cards;
                break;
            }
        }
        if (this.cards.length >= this.game.sfQualify) {
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    this.cards[0].suit +
                    " High";
            this.sfLength = this.cards.length;
            if (this.cards.length < this.game.cardsInHand) {
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length));
            }
        }
        return this.cards.length >= this.game.sfQualify;
    }
}
exports.Flush = Flush;
class Straight extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Straight", game, canDisqualify);
        this.sfQualify = 0; // additional property used below
    }
    solve() {
        let card;
        let checkCards = [];
        this.resetWildCards();
        // Handle the "wheel" special case.
        if (this.game.wheelStatus === 1) {
            this.cards = this.getWheel();
            if (this.cards.length) {
                let wildCount = 0;
                for (let i = 0; i < this.cards.length; i++) {
                    card = this.cards[i];
                    if (card.value === this.game.wildValue) {
                        wildCount++;
                    }
                    if (card.rank === 0) {
                        card.rank = exports.values.indexOf("A");
                        card.wildValue = "A";
                        if (card.value === "1") {
                            card.value = "A";
                        }
                    }
                }
                this.cards = this.cards.sort(Card.sort);
                for (; wildCount < this.wilds.length && this.cards.length < this.game.cardsInHand; wildCount++) {
                    card = this.wilds[wildCount];
                    card.rank = exports.values.indexOf("A");
                    card.wildValue = "A";
                    this.cards.push(card);
                }
                this.descr = this.name + ", Wheel";
                this.sfLength = this.game.sfQualify;
                if (this.cards[0].value === "A") {
                    this.cards = this.cards.concat(this.nextHighest().slice(1, this.game.cardsInHand - this.cards.length + 1));
                }
                else {
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length));
                }
                return true;
            }
            this.resetWildCards();
        }
        this.cards = this.getGaps();
        // Now add the wild cards and adjust their ranks.
        for (let i = 0; i < this.wilds.length; i++) {
            card = this.wilds[i];
            checkCards = this.getGaps(this.cards.length);
            if (this.cards.length === checkCards.length) {
                if (this.cards[0].rank < exports.values.length - 1) {
                    card.rank = this.cards[0].rank + 1;
                    card.wildValue = exports.values[card.rank];
                    this.cards.push(card);
                }
                else {
                    card.rank = this.cards[this.cards.length - 1].rank - 1;
                    card.wildValue = exports.values[card.rank];
                    this.cards.push(card);
                }
            }
            else {
                for (let j = 1; j < this.cards.length; j++) {
                    if (this.cards[j - 1].rank - this.cards[j].rank > 1) {
                        card.rank = this.cards[j - 1].rank - 1;
                        card.wildValue = exports.values[card.rank];
                        this.cards.push(card);
                        break;
                    }
                }
            }
            this.cards = this.cards.sort(Card.sort);
        }
        if (this.cards.length >= this.game.sfQualify) {
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    " High";
            this.cards = this.cards.slice(0, this.game.cardsInHand);
            this.sfLength = this.cards.length;
            if (this.cards.length < this.game.cardsInHand) {
                if (this.cards[this.sfLength - 1].rank === 0) {
                    this.cards = this.cards.concat(this.nextHighest().slice(1, this.game.cardsInHand - this.cards.length + 1));
                }
                else {
                    this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length));
                }
            }
        }
        return this.cards.length >= this.game.sfQualify;
    }
    getGaps(checkHandLength) {
        let wildCards;
        let cardsToCheck;
        let gapCards = [];
        let cardsList;
        let gapCount;
        let prevCard;
        let diff;
        const stripReturn = Hand.stripWilds(this.cardPool, this.game);
        wildCards = stripReturn[0];
        cardsToCheck = stripReturn[1];
        for (let i = 0; i < cardsToCheck.length; i++) {
            const c = cardsToCheck[i];
            if (c.wildValue === "A") {
                cardsToCheck.push(new Card("1" + c.suit));
            }
        }
        cardsToCheck = cardsToCheck.sort(Card.sort);
        if (checkHandLength) {
            // set initial i as one more than the highest rank in cardsToCheck
            // (This mirrors the original logic.)
            checkHandLength = this.game.sfQualify;
        }
        else {
            checkHandLength = this.game.sfQualify;
        }
        for (let i = exports.values.length; i > 0; i--) {
            cardsList = [];
            gapCount = 0;
            for (let j = 0; j < cardsToCheck.length; j++) {
                const c = cardsToCheck[j];
                if (c.rank > i)
                    continue;
                prevCard = cardsList[cardsList.length - 1];
                diff = prevCard ? prevCard.rank - c.rank : i - c.rank;
                if (diff === null) {
                    cardsList.push(c);
                }
                else if (checkHandLength < gapCount + diff + cardsList.length) {
                    break;
                }
                else if (diff > 0) {
                    cardsList.push(c);
                    gapCount += diff - 1;
                }
            }
            if (cardsList.length > gapCards.length) {
                gapCards = cardsList.slice();
            }
            if (this.game.sfQualify - gapCards.length <= wildCards.length) {
                break;
            }
        }
        return gapCards;
    }
    getWheel() {
        let wildCards;
        let cardsToCheck;
        let wheelCards = [];
        let wildCount = 0;
        let cardFound;
        const stripReturn = Hand.stripWilds(this.cardPool, this.game);
        wildCards = stripReturn[0];
        cardsToCheck = stripReturn[1];
        for (let i = 0; i < cardsToCheck.length; i++) {
            const c = cardsToCheck[i];
            if (c.wildValue === "A") {
                cardsToCheck.push(new Card("1" + c.suit));
            }
        }
        cardsToCheck = cardsToCheck.sort(Card.sort);
        for (let i = this.game.sfQualify - 1; i >= 0; i--) {
            cardFound = false;
            for (let j = 0; j < cardsToCheck.length; j++) {
                const c = cardsToCheck[j];
                if (c.rank > i)
                    continue;
                if (c.rank < i)
                    break;
                wheelCards.push(c);
                cardFound = true;
                break;
            }
            if (!cardFound) {
                if (wildCount < wildCards.length) {
                    wildCards[wildCount].rank = i;
                    wildCards[wildCount].wildValue = exports.values[i];
                    wheelCards.push(wildCards[wildCount]);
                    wildCount++;
                }
                else {
                    return [];
                }
            }
        }
        return wheelCards;
    }
}
exports.Straight = Straight;
class TwoThreeOfAKind extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Two Three Of a Kind", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            const cardsArr = this.values[i];
            if (this.cards.length > 0 && this.getNumCardsByRank(i) === 3) {
                this.cards = this.cards.concat(cardsArr || []);
                for (let j = 0; j < this.wilds.length; j++) {
                    const wild = this.wilds[j];
                    if (wild.rank !== -1)
                        continue;
                    if (cardsArr && cardsArr[0]) {
                        wild.rank = cardsArr[0].rank;
                    }
                    else if (this.cards[0].rank === exports.values.length - 1 &&
                        this.game.wildStatus === 1) {
                        wild.rank = exports.values.length - 2;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 6));
                break;
            }
            else if (this.getNumCardsByRank(i) === 3) {
                this.cards = this.cards.concat(cardsArr);
                for (let j = 0; j < this.wilds.length; j++) {
                    const wild = this.wilds[j];
                    if (wild.rank !== -1)
                        continue;
                    if (cardsArr && cardsArr[0]) {
                        wild.rank = cardsArr[0].rank;
                    }
                    else if (this.cards[0].rank === exports.values.length - 1 &&
                        this.game.wildStatus === 1) {
                        wild.rank = exports.values.length - 2;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
            }
        }
        if (this.cards.length >= 6) {
            const type = this.cards[0].toString().slice(0, -1) +
                "'s & " +
                this.cards[3].toString().slice(0, -1) +
                "'s";
            this.descr = this.name + ", " + type;
        }
        return this.cards.length >= 6;
    }
}
exports.TwoThreeOfAKind = TwoThreeOfAKind;
class ThreeOfAKind extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Three of a Kind", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 3) {
                this.cards = this.values[i] || [];
                for (let j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 3));
                break;
            }
        }
        if (this.cards.length >= 3) {
            if (this.game.noKickers) {
                this.cards.length = 3;
            }
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    "'s";
        }
        return this.cards.length >= 3;
    }
}
exports.ThreeOfAKind = ThreeOfAKind;
class ThreePair extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Three Pair", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            const cardsArr = this.values[i];
            if (this.cards.length > 2 && this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(cardsArr || []);
                for (let j = 0; j < this.wilds.length; j++) {
                    const wild = this.wilds[j];
                    if (wild.rank !== -1)
                        continue;
                    if (cardsArr && cardsArr[0]) {
                        wild.rank = cardsArr[0].rank;
                    }
                    else if (this.cards[0].rank === exports.values.length - 1 &&
                        this.game.wildStatus === 1) {
                        wild.rank = exports.values.length - 2;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 6));
                break;
            }
            else if (this.cards.length > 0 && this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(cardsArr || []);
                for (let j = 0; j < this.wilds.length; j++) {
                    const wild = this.wilds[j];
                    if (wild.rank !== -1)
                        continue;
                    if (cardsArr && cardsArr[0]) {
                        wild.rank = cardsArr[0].rank;
                    }
                    else if (this.cards[0].rank === exports.values.length - 1 &&
                        this.game.wildStatus === 1) {
                        wild.rank = exports.values.length - 2;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
            }
        }
        if (this.cards.length >= 6) {
            const type = this.cards[0].toString().slice(0, -1) +
                "'s & " +
                this.cards[2].toString().slice(0, -1) +
                "'s & " +
                this.cards[4].toString().slice(0, -1) +
                "'s";
            this.descr = this.name + ", " + type;
        }
        return this.cards.length >= 6;
    }
}
exports.ThreePair = ThreePair;
class TwoPair extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Two Pair", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            const cardsArr = this.values[i];
            if (this.cards.length > 0 && this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(cardsArr || []);
                for (let j = 0; j < this.wilds.length; j++) {
                    const wild = this.wilds[j];
                    if (wild.rank !== -1)
                        continue;
                    if (cardsArr && cardsArr[0]) {
                        wild.rank = cardsArr[0].rank;
                    }
                    else if (this.cards[0].rank === exports.values.length - 1 &&
                        this.game.wildStatus === 1) {
                        wild.rank = exports.values.length - 2;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 4));
                break;
            }
            else if (this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(cardsArr);
                for (let j = 0; j < this.wilds.length; j++) {
                    const wild = this.wilds[j];
                    if (wild.rank !== -1)
                        continue;
                    if (cardsArr && cardsArr[0]) {
                        wild.rank = cardsArr[0].rank;
                    }
                    else if (this.cards[0].rank === exports.values.length - 1 &&
                        this.game.wildStatus === 1) {
                        wild.rank = exports.values.length - 2;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
            }
        }
        if (this.cards.length >= 4) {
            if (this.game.noKickers) {
                this.cards.length = 4;
            }
            const type = this.cards[0].toString().slice(0, -1) +
                "'s & " +
                this.cards[2].toString().slice(0, -1) +
                "'s";
            this.descr = this.name + ", " + type;
        }
        return this.cards.length >= 4;
    }
}
exports.TwoPair = TwoPair;
class OnePair extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "Pair", game, canDisqualify);
    }
    solve() {
        this.resetWildCards();
        for (let i = 0; i < this.values.length; i++) {
            if (this.getNumCardsByRank(i) === 2) {
                this.cards = this.cards.concat(this.values[i] || []);
                for (let j = 0; j < this.wilds.length && this.cards.length < 2; j++) {
                    const wild = this.wilds[j];
                    if (this.cards && this.cards[0]) {
                        wild.rank = this.cards[0].rank;
                    }
                    else {
                        wild.rank = exports.values.length - 1;
                    }
                    wild.wildValue = exports.values[wild.rank];
                    this.cards.push(wild);
                }
                this.cards = this.cards.concat(this.nextHighest().slice(0, this.game.cardsInHand - 2));
                break;
            }
        }
        if (this.cards.length >= 2) {
            if (this.game.noKickers) {
                this.cards.length = 2;
            }
            this.descr =
                this.name +
                    ", " +
                    this.cards[0].toString().slice(0, -1) +
                    "'s";
        }
        return this.cards.length >= 2;
    }
}
exports.OnePair = OnePair;
class HighCard extends Hand {
    constructor(cards, game, canDisqualify = false) {
        super(cards, "High Card", game, canDisqualify);
    }
    solve() {
        this.cards = this.cardPool.slice(0, this.game.cardsInHand);
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            if (card.value === this.game.wildValue) {
                card.wildValue = "A";
                card.rank = exports.values.indexOf("A");
            }
        }
        if (this.game.noKickers) {
            this.cards.length = 1;
        }
        this.cards = this.cards.sort(Card.sort);
        this.descr = this.cards[0].toString().slice(0, -1) + " High";
        return true;
    }
}
exports.HighCard = HighCard;
const gameRules = {
    standard: {
        cardsInHand: 5,
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
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
    jacksbetter: {
        cardsInHand: 5,
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
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: ["Jc", "Jd", "4h", "3s", "2c"],
        noKickers: true,
    },
    joker: {
        cardsInHand: 5,
        handValues: [
            NaturalRoyalFlush,
            FiveOfAKind,
            WildRoyalFlush,
            StraightFlush,
            FourOfAKind,
            FullHouse,
            Flush,
            Straight,
            ThreeOfAKind,
            TwoPair,
            HighCard,
        ],
        wildValue: "O",
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: ["4c", "3d", "3h", "2s", "2c"],
        noKickers: true,
    },
    deuceswild: {
        cardsInHand: 5,
        handValues: [
            NaturalRoyalFlush,
            FourWilds,
            WildRoyalFlush,
            FiveOfAKind,
            StraightFlush,
            FourOfAKind,
            FullHouse,
            Flush,
            Straight,
            ThreeOfAKind,
            HighCard,
        ],
        wildValue: "2",
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 5,
        lowestQualified: ["5c", "4d", "3h", "3s", "3c"],
        noKickers: true,
    },
    threecard: {
        cardsInHand: 3,
        handValues: [
            StraightFlush,
            ThreeOfAKind,
            Straight,
            Flush,
            OnePair,
            HighCard,
        ],
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 3,
        lowestQualified: ["Qh", "3s", "2c"],
        noKickers: false,
    },
    fourcard: {
        cardsInHand: 4,
        handValues: [
            FourOfAKind,
            StraightFlush,
            ThreeOfAKind,
            Flush,
            Straight,
            TwoPair,
            OnePair,
            HighCard,
        ],
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 4,
        lowestQualified: null,
        noKickers: true,
    },
    fourcardbonus: {
        cardsInHand: 4,
        handValues: [
            FourOfAKind,
            StraightFlush,
            ThreeOfAKind,
            Flush,
            Straight,
            TwoPair,
            OnePair,
            HighCard,
        ],
        wildValue: null,
        wildStatus: 1,
        wheelStatus: 0,
        sfQualify: 4,
        lowestQualified: ["Ac", "Ad", "3h", "2s"],
        noKickers: true,
    },
    paigowpokerfull: {
        cardsInHand: 7,
        handValues: [
            FiveOfAKind,
            FourOfAKindPairPlus,
            StraightFlush,
            Flush,
            Straight,
            FourOfAKind,
            TwoThreeOfAKind,
            ThreeOfAKindTwoPair,
            FullHouse,
            ThreeOfAKind,
            ThreePair,
            TwoPair,
            OnePair,
            HighCard,
        ],
        wildValue: "O",
        wildStatus: 0,
        wheelStatus: 1,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
    paigowpokeralt: {
        cardsInHand: 7,
        handValues: [
            FourOfAKind,
            FullHouse,
            ThreeOfAKind,
            ThreePair,
            TwoPair,
            OnePair,
            HighCard,
        ],
        wildValue: "O",
        wildStatus: 0,
        wheelStatus: 1,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
    paigowpokersf6: {
        cardsInHand: 7,
        handValues: [StraightFlush, Flush, Straight],
        wildValue: "O",
        wildStatus: 0,
        wheelStatus: 1,
        sfQualify: 6,
        lowestQualified: null,
        noKickers: false,
    },
    paigowpokersf7: {
        cardsInHand: 7,
        handValues: [StraightFlush, Flush, Straight],
        wildValue: "O",
        wildStatus: 0,
        wheelStatus: 1,
        sfQualify: 7,
        lowestQualified: null,
        noKickers: false,
    },
    paigowpokerhi: {
        cardsInHand: 5,
        handValues: [
            FiveOfAKind,
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
        wildValue: "O",
        wildStatus: 0,
        wheelStatus: 1,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
    paigowpokerlo: {
        cardsInHand: 2,
        handValues: [OnePair, HighCard],
        wildValue: "O",
        wildStatus: 0,
        wheelStatus: 1,
        sfQualify: 5,
        lowestQualified: null,
        noKickers: false,
    },
};
// --------------------------
// Game class
// --------------------------
class Game {
    constructor(descr) {
        this.descr = descr;
        if (!this.descr || !gameRules[this.descr]) {
            this.descr = "standard";
        }
        const rule = gameRules[this.descr];
        this.cardsInHand = rule.cardsInHand;
        this.handValues = rule.handValues;
        this.wildValue = rule.wildValue;
        this.wildStatus = rule.wildStatus;
        this.wheelStatus = rule.wheelStatus;
        this.sfQualify = rule.sfQualify;
        this.lowestQualified = rule.lowestQualified;
        this.noKickers = rule.noKickers;
    }
}
exports.Game = Game;
// --------------------------
// PaiGowPokerHelper class
// --------------------------
class PaiGowPokerHelper {
    constructor(hand) {
        this.loGame = new Game("paigowpokerlo");
        this.hiGame = new Game("paigowpokerhi");
        if (Array.isArray(hand)) {
            this.baseHand = Hand.solve(hand, new Game("paigowpokerfull"));
        }
        else {
            this.baseHand = hand;
        }
        this.game = this.baseHand.game;
    }
    splitHouseWay() {
        let hiCards = [];
        let loCards = [];
        const rank = this.game.handValues.length - this.baseHand.rank;
        const handValue = this.game.handValues[rank];
        if (handValue === FiveOfAKind) {
            if (this.baseHand.cards[5].value === "K" &&
                this.baseHand.cards[6].value === "K") {
                loCards = this.baseHand.cards.slice(5, 7);
                hiCards = this.baseHand.cards.slice(0, 5);
            }
            else {
                loCards = this.baseHand.cards.slice(0, 2);
                hiCards = this.baseHand.cards.slice(2, 7);
            }
        }
        else if (handValue === FourOfAKindPairPlus) {
            if (this.baseHand.cards[0].wildValue === "A" &&
                this.baseHand.cards[4].value !== "K") {
                hiCards = this.baseHand.cards.slice(0, 2);
                loCards = this.baseHand.cards.slice(2, 4);
                hiCards = hiCards.concat(this.baseHand.cards.slice(4, 7));
            }
            else {
                hiCards = this.baseHand.cards.slice(0, 4);
                loCards = this.baseHand.cards.slice(4, 6);
                hiCards.push(this.baseHand.cards[6]);
            }
        }
        else if (handValue === StraightFlush ||
            handValue === Flush ||
            handValue === Straight) {
            const altGame = new Game("paigowpokeralt");
            const altHand = Hand.solve(this.baseHand.cards, altGame);
            const altRank = altGame.handValues.length - altHand.rank;
            if (altGame.handValues[altRank] === FourOfAKind) {
                const sfReturn = this.getSFData(altHand.cards);
                hiCards = sfReturn[0];
                loCards = sfReturn[1];
            }
            else if (altGame.handValues[altRank] === FullHouse) {
                hiCards = altHand.cards.slice(0, 3);
                loCards = altHand.cards.slice(3, 5);
                hiCards = hiCards.concat(altHand.cards.slice(5, 7));
            }
            else if (altGame.handValues[altRank] === ThreeOfAKind) {
                const sfReturn = this.getSFData(altHand.cards);
                hiCards = sfReturn[0];
                loCards = sfReturn[1];
            }
            else if (altGame.handValues[altRank] === ThreePair) {
                loCards = altHand.cards.slice(0, 2);
                hiCards = altHand.cards.slice(2, 7);
            }
            else if (altGame.handValues[altRank] === TwoPair) {
                if (altHand.cards[0].rank < 6) {
                    if (altHand.cards[4].wildValue === "A") {
                        hiCards = altHand.cards.slice(0, 4);
                        loCards = altHand.cards.slice(4, 6);
                        hiCards.push(altHand.cards[6]);
                    }
                    else {
                        const sfReturn = this.getSFData(altHand.cards);
                        hiCards = sfReturn[0];
                        loCards = sfReturn[1];
                    }
                }
                else if (altHand.cards[0].rank < 10) {
                    if (altHand.cards[4].wildValue === "A") {
                        hiCards = altHand.cards.slice(0, 4);
                        loCards = altHand.cards.slice(4, 6);
                        hiCards.push(altHand.cards[6]);
                    }
                    else {
                        hiCards = altHand.cards.slice(0, 2);
                        loCards = altHand.cards.slice(2, 4);
                        hiCards = hiCards.concat(altHand.cards.slice(4, 7));
                    }
                }
                else if (altHand.cards[0].wildValue !== "A" &&
                    altHand.cards[2].rank < 6 &&
                    altHand.cards[4].wildValue === "A") {
                    hiCards = altHand.cards.slice(0, 4);
                    loCards = altHand.cards.slice(4, 6);
                    hiCards.push(altHand.cards[6]);
                }
                else {
                    hiCards = altHand.cards.slice(0, 2);
                    loCards = altHand.cards.slice(2, 4);
                    hiCards = hiCards.concat(altHand.cards.slice(4, 7));
                }
            }
            else if (altGame.handValues[altRank] === OnePair) {
                if (altHand.cards[0].rank >= exports.values.indexOf("T") &&
                    altHand.cards[0].rank <= exports.values.indexOf("K") &&
                    altHand.cards[2].wildValue === "A") {
                    let possibleSF = altHand.cards.slice(0, 2);
                    possibleSF = possibleSF.concat(altHand.cards.slice(3, 7));
                    const sfReturn = this.getSFData(possibleSF);
                    if (sfReturn[0].length) {
                        hiCards = sfReturn[0];
                        loCards = sfReturn[1];
                        loCards.push(altHand.cards[2]);
                    }
                    else {
                        hiCards = altHand.cards.slice(0, 2);
                        loCards = altHand.cards.slice(2, 4);
                        hiCards = hiCards.concat(altHand.cards.slice(4, 7));
                    }
                }
                else {
                    const sfReturn = this.getSFData(altHand.cards.slice(2, 7));
                    if (sfReturn[0].length) {
                        hiCards = sfReturn[0];
                        loCards = altHand.cards.slice(0, 2);
                    }
                    else {
                        const sfReturn2 = this.getSFData(altHand.cards);
                        hiCards = sfReturn2[0];
                        loCards = sfReturn2[1];
                    }
                }
            }
            else {
                const sfReturn = this.getSFData(altHand.cards);
                hiCards = sfReturn[0];
                loCards = sfReturn[1];
            }
        }
        else if (handValue === FourOfAKind) {
            if (this.baseHand.cards[0].rank < 6) {
                hiCards = this.baseHand.cards.slice(0, 4);
                loCards = this.baseHand.cards.slice(4, 6);
                hiCards.push(this.baseHand.cards[6]);
            }
            else if (this.baseHand.cards[0].rank < 10 &&
                this.baseHand.cards[4].wildValue === "A") {
                hiCards = this.baseHand.cards.slice(0, 4);
                loCards = this.baseHand.cards.slice(4, 6);
                hiCards.push(this.baseHand.cards[6]);
            }
            else {
                hiCards = this.baseHand.cards.slice(0, 2);
                loCards = this.baseHand.cards.slice(2, 4);
                hiCards = hiCards.concat(this.baseHand.cards.slice(4, 7));
            }
        }
        else if (handValue === TwoThreeOfAKind) {
            loCards = this.baseHand.cards.slice(0, 2);
            hiCards = this.baseHand.cards.slice(3, 6);
            hiCards.push(this.baseHand.cards[2]);
            hiCards.push(this.baseHand.cards[6]);
        }
        else if (handValue === ThreeOfAKindTwoPair) {
            hiCards = this.baseHand.cards.slice(0, 3);
            loCards = this.baseHand.cards.slice(3, 5);
            hiCards = hiCards.concat(this.baseHand.cards.slice(5, 7));
        }
        else if (handValue === FullHouse) {
            if (this.baseHand.cards[3].wildValue === "2" &&
                this.baseHand.cards[5].wildValue === "A" &&
                this.baseHand.cards[6].wildValue === "K") {
                hiCards = this.baseHand.cards.slice(0, 5);
                loCards = this.baseHand.cards.slice(5, 7);
            }
            else {
                hiCards = this.baseHand.cards.slice(0, 3);
                loCards = this.baseHand.cards.slice(3, 5);
                hiCards = hiCards.concat(this.baseHand.cards.slice(5, 7));
            }
        }
        else if (handValue === ThreeOfAKind) {
            if (this.baseHand.cards[0].wildValue === "A") {
                hiCards = this.baseHand.cards.slice(0, 2);
                loCards = this.baseHand.cards.slice(2, 4);
                hiCards = hiCards.concat(this.baseHand.cards.slice(4, 7));
            }
            else {
                hiCards = this.baseHand.cards.slice(0, 3);
                loCards = this.baseHand.cards.slice(3, 5);
                hiCards = hiCards.concat(this.baseHand.cards.slice(5, 7));
            }
        }
        else if (handValue === ThreePair) {
            loCards = this.baseHand.cards.slice(0, 2);
            hiCards = this.baseHand.cards.slice(2, 7);
        }
        else if (handValue === TwoPair) {
            if (this.baseHand.cards[0].rank < 6) {
                hiCards = this.baseHand.cards.slice(0, 4);
                loCards = this.baseHand.cards.slice(4, 6);
                hiCards.push(this.baseHand.cards[6]);
            }
            else if (this.baseHand.cards[0].rank < 10) {
                if (this.baseHand.cards[4].wildValue === "A") {
                    hiCards = this.baseHand.cards.slice(0, 4);
                    loCards = this.baseHand.cards.slice(4, 6);
                    hiCards.push(this.baseHand.cards[6]);
                }
                else {
                    hiCards = this.baseHand.cards.slice(0, 2);
                    loCards = this.baseHand.cards.slice(2, 4);
                    hiCards = hiCards.concat(this.baseHand.cards.slice(4, 7));
                }
            }
            else if (this.baseHand.cards[0].wildValue !== "A" &&
                this.baseHand.cards[2].rank < 6 &&
                this.baseHand.cards[4].wildValue === "A") {
                hiCards = this.baseHand.cards.slice(0, 4);
                loCards = this.baseHand.cards.slice(4, 6);
                hiCards.push(this.baseHand.cards[6]);
            }
            else {
                hiCards = this.baseHand.cards.slice(0, 2);
                loCards = this.baseHand.cards.slice(2, 4);
                hiCards = hiCards.concat(this.baseHand.cards.slice(4, 7));
            }
        }
        else if (handValue === OnePair) {
            hiCards = this.baseHand.cards.slice(0, 2);
            loCards = this.baseHand.cards.slice(2, 4);
            hiCards = hiCards.concat(this.baseHand.cards.slice(4, 7));
        }
        else {
            hiCards = [this.baseHand.cards[0]];
            loCards = this.baseHand.cards.slice(1, 3);
            hiCards = hiCards.concat(this.baseHand.cards.slice(3, 7));
        }
        this.hiHand = Hand.solve(hiCards, this.hiGame);
        this.loHand = Hand.solve(loCards, this.loGame);
    }
    getSFData(cards) {
        let hiCards = [];
        let possibleLoCards;
        let bestLoCards = [];
        let bestHand = null;
        const handsToCheck = [
            new StraightFlush(cards, new Game("paigowpokersf7"), false),
            new StraightFlush(cards, new Game("paigowpokersf6"), false),
            new StraightFlush(cards, this.game, false),
            new Flush(cards, new Game("paigowpokersf7"), false),
            new Flush(cards, new Game("paigowpokersf6"), false),
            new Flush(cards, this.game, false),
            new Straight(cards, new Game("paigowpokersf7"), false),
            new Straight(cards, new Game("paigowpokersf6"), false),
            new Straight(cards, this.game, false),
        ];
        for (let i = 0; i < handsToCheck.length; i++) {
            const hand = handsToCheck[i];
            if (hand.isPossible) {
                if (hand.sfLength === 7) {
                    possibleLoCards = [hand.cards[0], hand.cards[1]];
                }
                else if (hand.sfLength === 6) {
                    possibleLoCards = [hand.cards[0]];
                    if (cards.length > 6) {
                        possibleLoCards.push(hand.cards[6]);
                    }
                }
                else if (cards.length > 5) {
                    possibleLoCards = [hand.cards[5]];
                    if (cards.length > 6) {
                        possibleLoCards.push(hand.cards[6]);
                    }
                }
                if (possibleLoCards) {
                    possibleLoCards = possibleLoCards.sort(Card.sort);
                    if (!bestLoCards.length ||
                        bestLoCards[0].rank < possibleLoCards[0].rank ||
                        (bestLoCards.length > 1 &&
                            bestLoCards[0].rank === possibleLoCards[0].rank &&
                            bestLoCards[1].rank < possibleLoCards[1].rank)) {
                        bestLoCards = possibleLoCards;
                        bestHand = hand;
                    }
                }
                else if (!bestHand) {
                    bestHand = hand;
                    break;
                }
            }
        }
        if (bestHand) {
            if (bestHand.sfLength === 7) {
                hiCards = bestHand.cards.slice(2, 7);
            }
            else if (bestHand.sfLength === 6) {
                hiCards = bestHand.cards.slice(1, 6);
            }
            else {
                hiCards = bestHand.cards.slice(0, 5);
            }
        }
        return [hiCards, bestLoCards];
    }
    qualifiesValid() {
        const compareHands = Hand.winners([this.hiHand, this.loHand]);
        return !(compareHands.length === 1 && compareHands[0] === this.loHand);
    }
    static winners(player, banker) {
        if (!player.qualifiesValid()) {
            if (banker.qualifiesValid()) {
                return -1;
            }
            return 0;
        }
        if (!banker.qualifiesValid()) {
            return 1;
        }
        const hiWinner = Hand.winners([player.hiHand, banker.hiHand]);
        const loWinner = Hand.winners([player.loHand, banker.loHand]);
        if (hiWinner.length === 1 &&
            hiWinner[0] === player.hiHand &&
            loWinner.length === 1 &&
            loWinner[0] === player.loHand) {
            return 1;
        }
        if (hiWinner.length === 1 && hiWinner[0] === player.hiHand) {
            return 0;
        }
        if (loWinner.length === 1 && loWinner[0] === player.loHand) {
            return 0;
        }
        return -1;
    }
    static setHands(hiHand, loHand) {
        let fullHand = [];
        if (Array.isArray(hiHand)) {
            hiHand = Hand.solve(hiHand, new Game("paigowpokerhi"));
        }
        fullHand = fullHand.concat(hiHand.cardPool);
        if (Array.isArray(loHand)) {
            loHand = Hand.solve(loHand, new Game("paigowpokerlo"));
        }
        fullHand = fullHand.concat(loHand.cardPool);
        const result = new PaiGowPokerHelper(fullHand);
        result.hiHand = hiHand;
        result.loHand = loHand;
        return result;
    }
    static solve(fullHand) {
        const result = new PaiGowPokerHelper(fullHand || [""]);
        result.splitHouseWay();
        return result;
    }
}
exports.PaiGowPokerHelper = PaiGowPokerHelper;
// --------------------------
// exportToGlobal helper
// --------------------------
function exportToGlobal(global) {
    global.Card = Card;
    global.Hand = Hand;
    global.Game = Game;
    global.RoyalFlush = RoyalFlush;
    global.NaturalRoyalFlush = NaturalRoyalFlush;
    global.WildRoyalFlush = WildRoyalFlush;
    global.FiveOfAKind = FiveOfAKind;
    global.StraightFlush = StraightFlush;
    global.FourOfAKindPairPlus = FourOfAKindPairPlus;
    global.FourOfAKind = FourOfAKind;
    global.FourWilds = FourWilds;
    global.TwoThreeOfAKind = TwoThreeOfAKind;
    global.ThreeOfAKindTwoPair = ThreeOfAKindTwoPair;
    global.FullHouse = FullHouse;
    global.Flush = Flush;
    global.Straight = Straight;
    global.ThreeOfAKind = ThreeOfAKind;
    global.ThreePair = ThreePair;
    global.TwoPair = TwoPair;
    global.OnePair = OnePair;
    global.HighCard = HighCard;
    global.PaiGowPokerHelper = PaiGowPokerHelper;
}
// Export for node.js.
if (typeof exports !== "undefined") {
    exportToGlobal(exports);
}
// Export to window for browser.
if (typeof window !== "undefined") {
    exportToGlobal(window);
}
