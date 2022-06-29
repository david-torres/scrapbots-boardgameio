// @ts-check
import { INVALID_MOVE } from 'boardgame.io/core';

const shuffle = (stack) => {
    for (let i = stack.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [stack[i], stack[j]] = [stack[j], stack[i]];
    }
}

const draw = (stack, n) => {
    let r = []
    for (n; n > 0; n--) {
        let card = stack.shift()
        if (card == undefined) {
            break;
        }
        r.push(card)
    }
    return r
}

const drawWithCycling = (G, ctx, n) => {
    let hand = G.playerHand[ctx.currentPlayer]
    let deck = G.playerDeck[ctx.currentPlayer]
    let discard = G.playerDiscard[ctx.currentPlayer]

    let cards = draw(deck, n)

    if (cards.length < n) {
        n -= cards.length
        // cycle discard pile into deck
        ctx.random.Shuffle(discard)
        for (let i = discard.length; i > 0; i--) {
            let card = discard.pop()
            deck.push(card)
        }

        let cards2 = draw(deck, n)
        cards = cards.concat(cards2)
    }

    hand = hand.concat(cards)
    return { hand, deck, discard }
}

const getOpposingLaneIndex = (i) => {
    let o = 0
    switch (i) {
        case i == 0:
            o = 4;
            break;
        case i == 1:
            o = 3;
            break;
        case i == 2:
            o = 2;
            break;
        case i == 3:
            o = 1;
            break;
        case i == 4:
            o = 0;
            break;
    }

    return o
}

const cleanupPhase = (G, ctx) => {
    console.log('cleanupPhase')
    let hand = G.playerHand[ctx.currentPlayer]
    let deck = G.playerDeck[ctx.currentPlayer]
    let discard = G.playerDiscard[ctx.currentPlayer]

    discard = discard.concat(hand)

    G.scrap = 0
    G.energy = 0

    // todo, ready exhausted scrapbots
}

const drawPhase = (G, ctx) => {
    console.log('drawPhase')
    let hand = G.playerHand[ctx.currentPlayer]
    let deck = G.playerDeck[ctx.currentPlayer]
    let discard = G.playerDiscard[ctx.currentPlayer]

    ({ hand, deck, discard } = drawWithCycling(G, ctx, DEFAULT_HAND_SIZE))

    // handle malfunctions
    let malfunctionCount = 0
    for (let i = 0; i < hand.length; i++) {
        if (hand[i].type === 'malfunction') {
            // discard all malfunctions
            let malfunction = hand.splice(i, 1);
            discard.push(malfunction)
            malfunctionCount++
        }
    }

    if (malfunctionCount > 0) {
        // draw malfunctions * 2
        ({ hand, deck, discard } = drawWithCycling(G, ctx, malfunctionCount * 2))
    }
}

let mainDeck = require('../data/scrapbots-main-deck.json')
let p1Deck = require('../data/scrapbots-starter-deck.json')
let p2Deck = p1Deck.slice() // copy p1Deck
let malfunctionDeck = require('../data/scrapbots-malfunctions-deck.json')
let marketServoids = require('../data/scrapbots-servoid-market-stack.json')
let marketPowerCells = require('../data/scrapbots-powercell-market-stack.json')

shuffle(mainDeck)
shuffle(p1Deck)
shuffle(p2Deck)

let p1Hand = draw(p1Deck, 3)
let p2Hand = draw(p2Deck, 5)
let market = draw(mainDeck, 10)

const DEFAULT_HAND_SIZE = 5
const INITIAL_GAME_STATE = {
    mainDeck,
    playerDeck: {0: p1Deck, 1: p2Deck},
    playerHand: {0: p1Hand, 1: p2Hand},
    playerDiscard: {0: [], 1: []},
    playerLanes: {0: Array(5).fill({
        scrapbot: null,
        gadget: null,
        damage: 0
    }), 1: Array(5).fill({
        scrapbot: null,
        gadget: null,
        damage: 0
    })},
    malfunctionDeck,
    market,
    marketServoids,
    marketPowerCells,
    trash: [],
    scrap: 0,
    energy: 0
}


export const Scrapbots = {
    minPlayers: 2,
    maxPlayers: 2,

    setup: () => ({
        ...INITIAL_GAME_STATE
    }),

    turn: {
        phases: {
            main: {
                start: true,
                // use main moves list
                next: 'cleanup',
                maxMoves: 1,
                endIf: (G, ctx) => {
                    console.log('check for main phase end')
                    return true
                }
            }, 
            cleanup: {
                minMoves: 1,
                maxMoves: 1,
                moves: {
                    cleanupPhase
                },
                next: 'draw'
            },
            draw: {
                minMoves: 1,
                maxMoves: 1,
                moves: {
                    drawPhase
                },
            },
        },
    },

    /**
     * moves MUST modify game state (G) and MUST NOT have any side-effects besides that
     */
    moves: {
        recycleScrapbotForScrap: (G, ctx, card) => {
            console.log(`Recycle ${card.name} for ${card.recycle} scrap (current: ${G.scrap})`)
            let hand = G.playerHand[ctx.currentPlayer]
            let discard = G.playerDiscard[ctx.currentPlayer]

            if (card.type != 'scrapbot') return INVALID_MOVE;
            if (hand.findIndex(handCard => handCard.name == card.name) === -1) return INVALID_MOVE;

            // add recycle value to current scrap count
            G.scrap += card.recycle

            // remove card from hand
            for (let i = 0; i < hand.length; i++) {
                if (hand[i].name === card.name) {
                    hand.splice(i, 1);
                }
            }

            // add to discard
            discard.push(card)
        },
        recycleGadgetForScrap: (G, ctx, card) => {
            console.log(`Recycle ${card.name} for ${card.recycle} scrap (current: ${G.scrap})`)
            let hand = G.playerHand[ctx.currentPlayer]
            let discard = G.playerDiscard[ctx.currentPlayer]

            if (card.type != 'gadget') return INVALID_MOVE;
            if (hand.findIndex(handCard => handCard.name == card.name) === -1) return INVALID_MOVE;

            // add recycle value to current scrap count
            G.scrap += card.recycle

            // remove card from hand
            for (let i = 0; i < hand.length; i++) {
                if (hand[i].name === card.name) {
                    hand.splice(i, 1);
                }
            }

            // add to discard
            discard.push(card)
        },
        recycleGadgetForEnergy: (G, ctx, card) => {
            console.log(`Recycle ${card.name} for ${card.recycle} energy (current: ${G.energy})`)
            let hand = G.playerHand[ctx.currentPlayer]
            let discard = G.playerDiscard[ctx.currentPlayer]

            if (card.type != 'gadget') return INVALID_MOVE;
            if (hand.findIndex(handCard => handCard.name == card.name) === -1) return INVALID_MOVE;

            // add recycle value to current scrap count
            G.energy += card.recycle

            // remove card from hand
            for (let i = 0; i < hand.length; i++) {
                if (hand[i].name === card.name) {
                    hand.splice(i, 1);
                }
            }

            // add to discard
            discard.push(card)
        },
        buyFromMarket: (G, ctx, card) => {
            console.log(`Buying ${card.name} from market`)
            let market = G.market
            let discard = G.playerDiscard[ctx.currentPlayer]

            if (G.scrap < card.cost) return INVALID_MOVE;
            if (market.findIndex(marketCard => marketCard.name == card.name) === -1) {
                console.log('could not find in market', card.name)
                return INVALID_MOVE;
            }

            // pay for card
            G.scrap -= card.cost

            // remove card from market
            for (let i = 0; i < market.length; i++) {
                if (market[i].name === card.name) {
                    market.splice(i, 1);
                    break;
                }
            }

            // add to discard
            discard.push(card)

            // refresh market
            let deck = G.mainDeck
            let cards = draw(deck, 1)
            market.push(cards[0])
        },
        buyServoid: (G, ctx) => {
            console.log(`Buying Servoid from market`)
            let market = G.marketServoids
            let discard = G.playerDiscard[ctx.currentPlayer]

            if (market.length === 0) return INVALID_MOVE;
            if (G.scrap < market[0].cost) return INVALID_MOVE;

            let card = market.pop()

            // pay for card
            G.scrap -= card.cost

            // add to discard
            discard.push(card)
        },
        buyPowerCell: (G, ctx) => {
            console.log(`Buying Power Cell from market`)
            let market = G.marketPowerCells
            let discard = G.playerDiscard[ctx.currentPlayer]

            if (market.length === 0) return INVALID_MOVE;
            if (G.scrap < market[0].cost) return INVALID_MOVE;

            let card = market.pop()

            // pay for card
            G.scrap -= card.cost

            // add to discard
            discard.push(card)
        },
        buildScrapbot: (G, ctx, card, laneIndex) => {
            console.log(`Building ${card.name} in lane ${laneIndex}`)
            let hand = G.playerHand[ctx.currentPlayer]
            let lanes = G.playerLanes[ctx.currentPlayer]

            if (card.type != 'scrapbot') return INVALID_MOVE;
            if (hand.findIndex(handCard => handCard.name == card.name) === -1) return INVALID_MOVE;
            if (lanes[laneIndex].scrapbot !== null) return INVALID_MOVE;

            // remove card from hand
            for (let i = 0; i < hand.length; i++) {
                if (hand[i].name === card.name) {
                    hand.splice(i, 1);
                }
            }

            // add card to lane
            lanes[laneIndex].scrapbot = card
        },
        // attachGadget: (G, ctx, card, laneIndex) => {
        //     G.scrap = 1
        // },
        // activateScrapbot: (G, ctx, laneIndex) => {
        //     G.scrap = 1
        // },
        // activateGadget: (G, ctx, laneIndex) => {
        //     G.scrap = 1
        // },
        attack: (G, ctx, laneIndex) => {
            console.log(`Attacking from lane ${laneIndex}`)

            let discard = G.playerDiscard[ctx.currentPlayer]
            let lanes = G.playerLanes[ctx.currentPlayer]
            let opposingDiscard = G.playerDiscard[(ctx.currentPlayer ? 0 : 1)]
            let opposingLanes = G.playerLanes[(ctx.currentPlayer ? 0 : 1)]

            let attackingScrapbot = lanes[laneIndex].scrapbot

            if (lanes[laneIndex].scrapbot == null) return INVALID_MOVE;
            if (attackingScrapbot.energy > G.energy) return INVALID_MOVE;

            // pay for attack
            G.energy -= attackingScrapbot.energy

            // get opposing scrapbot
            let opposingLaneIndex = getOpposingLaneIndex();
            let opposingLane = opposingLanes[opposingLaneIndex]

            // no opposition, deal damage to the face!
            if (opposingLane.scrapbot === null) {
                // deal malfunctions
                let malfunctionDeck = G.malfunctionDeck
                let malfunctions = draw(malfunctionDeck, attackingScrapbot.attack)
                opposingDiscard = opposingDiscard.concat(malfunctions)
                console.log('dealing malfunctions', malfunctionDeck, malfunctions, opposingDiscard)
            } else {
                // dismantle opposing scrapbot
                let opposingScrapbot = opposingLane.scrapbot
                if ((attackingScrapbot.attack + opposingLane.damage) >= opposingScrapbot.health) {
                    opposingDiscard.push(opposingScrapbot)
                    opposingLane.scrapbot = null
                    if (opposingLane.gadget !== null) {
                        let gadget = opposingLane.gadget
                        opposingDiscard.push(gadget)
                        opposingLane.gadget = null
                    }
                } else {
                    // damage opposing scrapbot
                    opposingLane.damage += attackingScrapbot.attack
                }
            }

            // todo, what is the best way to handle triggers/passives?
            // handle "after attacking triggers"
            if (attackingScrapbot.name == 'Servoid') {
                let lane = lanes[laneIndex]
                // servoid dismantles after attacking
                discard.push(attackingScrapbot)
                lane.scrapbot = null
                if (lane.gadget !== null) {
                    let gadget = lane.gadget
                    discard.push(gadget)
                    lane.gadget = null
                }
            }
        },
    },

    endIf: (G, ctx) => {
        console.log('check for game end')
        // game ends when the malfunction deck is empty
        if (G.malfunctionDeck.length === 0) {
            let p1Hand = G.playerHand[0]
            let p1Deck = G.playerDeck[0]
            let p1Discard = G.playerDiscard[0]
            let p2Hand = G.playerHand[1]
            let p2Deck = G.playerDeck[1]
            let p2Discard = G.playerDiscard[1]

            let p1MalfunctionCount = 0
            let p2MalfunctionCount = 0

            // add up p1 malfunctions
            for (let i = 0; i < p1Hand.length; i++) {
                if (p1Hand[i].type === 'malfunction') {
                    p1MalfunctionCount++;
                }
            }
            for (let i = 0; i < p1Deck.length; i++) {
                if (p1Deck[i].type === 'malfunction') {
                    p1MalfunctionCount++;
                }
            }
            for (let i = 0; i < p1Discard.length; i++) {
                if (p1Discard[i].type === 'malfunction') {
                    p1MalfunctionCount++;
                }
            }

            // add up p2 malfunctions
            for (let i = 0; i < p2Hand.length; i++) {
                if (p2Hand[i].type === 'malfunction') {
                    p2MalfunctionCount++;
                }
            }
            for (let i = 0; i < p2Deck.length; i++) {
                if (p2Deck[i].type === 'malfunction') {
                    p2MalfunctionCount++;
                }
            }
            for (let i = 0; i < p2Discard.length; i++) {
                if (p2Discard[i].type === 'malfunction') {
                    p2MalfunctionCount++;
                }
            }

            // declare winner
            if (p2MalfunctionCount > p1MalfunctionCount) {
                return { winner: 0 } // p1 wins
            } else {
                return { winner: 1 } // p2 wins
            }
        }
    },

    ai: {
        enumerate: (G, ctx) => {
            console.log(`player ${ctx.currentPlayer} enumerating moves.`)
            let moves = [];
            let hand = G.playerHand[ctx.currentPlayer]
            let lanes = G.playerLanes[ctx.currentPlayer]

            console.log(`State: Hand (${hand.length}), Scrap: (${G.scrap}), Energy: (${G.energy})`)

            for (let i = 0; i < hand.length; i++) {
                let card = hand[i]
                if (card.type == 'scrapbot') {
                    // recycle
                    moves.push({ move: 'recycleScrapbotForScrap', args: [card] });

                    // check if lanes are available to build in
                    for (let i = 0; i < lanes.length; i++) {
                        let laneOccupant = lanes[i]
                        if (laneOccupant.scrapbot === null) {
                            moves.push({ move: 'buildScrapbot', args: [card, i] });
                        }
                    }
                }
                if (card.type == 'gadget') {
                    // recycle
                    moves.push({ move: 'recycleGadgetForScrap', args: [card] });
                    moves.push({ move: 'recycleGadgetForEnergy', args: [card] });

                    // check if built scrapbots are available to attach to
                    // moves.push({ move: 'attachGadget', args: [card] });
                }
            }

            // market buys
            if (G.scrap > 0) {
                if (G.scrap >= 2) {
                    if (G.marketServoids.length > 0) {
                        moves.push({ move: 'buyServoid', args: [] })
                    }
                    if (G.marketPowerCells.length > 0) {
                        moves.push({ move: 'buyPowerCell', args: [] })
                    }
                }
                for (let i = 0; i < market.length; i++) {
                    let card = market[i]
                    if (card.cost <= G.scrap) {
                        moves.push({ move: 'buyFromMarket', args: [card] })
                    }
                }
            }

            // check for available activations
            // moves.push({ move: 'activateScrapbot', args: [card] });
            // moves.push({ move: 'activateGadget', args: [card] });

            // check for available attacks
            for (let i = 0; i < lanes.length; i++) {
                let lane = lanes[i]
                if (lane.scrapbot) {
                    if (lane.scrapbot.energy <= G.energy) {
                        moves.push({ move: 'attack', args: [i] });
                    }
                }
            }


            console.log('enumerated moves: ', moves.length)
            // if (moves.length === 0) ctx.events.endPhase()
            if (moves.length === 0) console.log('should end phase...')
            return moves;
        },
    },
};
