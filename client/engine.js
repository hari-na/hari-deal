/**
 * Hari Deal - Game Engine
 * Faithful implementation of Monopoly Deal rules with Bengaluru reskin.
 */

const PROPERTY_CONFIG = {
    brown: { name: 'Brown', count: 2, rent: [1, 2], values: [1, 1], properties: ['Rameshwaram', 'Ganesh Darshan'], color: '#795548' },
    lightBlue: { name: 'Light Blue', count: 3, rent: [1, 2, 3], values: [1, 1, 1], properties: ['Bean Lore', 'Blue Tokai', 'Third Wave Coffee'], color: '#03A9F4' },
    pink: { name: 'Pink', count: 3, rent: [1, 2, 4], values: [2, 2, 2], properties: ['Commercial Street', 'Chickpet Market', 'Avenue Road'], color: '#E91E63' },
    orange: { name: 'Orange', count: 3, rent: [1, 3, 5], values: [2, 2, 2], properties: ['Kormangala', 'HSR Layout', 'BTM Layout'], color: '#FF9800' },
    red: { name: 'Red', count: 3, rent: [2, 3, 6], values: [3, 3, 3], properties: ['MG Road', 'Brigade Road', 'Lavelle Road'], color: '#F44336' },
    yellow: { name: 'Yellow', count: 3, rent: [2, 4, 6], values: [3, 3, 3], properties: ['Church Street', 'Indiranagar', 'St. Marks Road'], color: '#FFEB3B' },
    green: { name: 'Green', count: 3, rent: [2, 4, 7], values: [4, 4, 4], properties: ['Jayanagar', 'Hebbal', 'Whitefield'], color: '#4CAF50' },
    darkBlue: { name: 'Dark Blue', count: 2, rent: [3, 8], values: [4, 4], properties: ['Embassy Lake Terraces', 'Brigade Metropolis'], color: '#3F51B5' },
    railroad: { name: 'Railroad', count: 4, rent: [1, 2, 3, 4], values: [2, 2, 2, 2], properties: ['Majestic Metro', 'KR Puram Train', 'Yeshwanthpur Junction', 'Cantonment Station'], color: '#212121' },
    utility: { name: 'Utility', count: 2, rent: [1, 2], values: [2, 2], properties: ['BESCOM', 'BWSSB'], color: '#CDDC39' }
};

const ACTION_CARDS = {
    DEAL_BREAKER: { name: 'Deal Breaker', count: 2, value: 5, text: 'Steal a completed set of properties from any player. (Includes any buildings)' },
    SLY_DEAL: { name: 'Sly Deal', count: 3, value: 3, text: 'Steal a property from any player. (Cannot be part of a completed set)' },
    FORCED_DEAL: { name: 'Forced Deal', count: 3, value: 3, text: 'Swap any property with another player. (Cannot be part of a completed set)' },
    DEBT_COLLECTOR: { name: 'Debt Collector', count: 3, value: 3, text: 'Force any player to pay you $2M' },
    ITS_MY_BIRTHDAY: { name: 'It\'s My Birthday', count: 3, value: 2, text: 'All players pay you $2M' },
    PASS_GO: { name: 'Pass Go', count: 10, value: 1, text: 'Draw 2 extra cards.' },
    JUST_SAY_NO: { name: 'Just Say No', count: 3, value: 4, text: 'Use any time an action card is played against you.' },
    DOUBLE_THE_RENT: { name: 'Double the Rent', count: 2, value: 1, text: 'Play with a Rent card to double the total rent.' },
    HOUSE: { name: 'House', count: 3, value: 3, text: 'Add onto any completed set of properties. Adds $3M to rent value. (Except Railroads and Utilities)' },
    HOTEL: { name: 'Hotel', count: 2, value: 4, text: 'Add onto any completed set of properties that already has a House. Adds $4M to rent value.' }
};

const MONEY_CARDS = [
    { value: 1, count: 6 },
    { value: 2, count: 5 },
    { value: 3, count: 3 },
    { value: 4, count: 3 },
    { value: 5, count: 2 },
    { value: 10, count: 1 }
];

const RENT_CARDS = [
    { colors: ['green', 'darkBlue'], count: 2, value: 1 },
    { colors: ['brown', 'lightBlue'], count: 2, value: 1 },
    { colors: ['pink', 'orange'], count: 2, value: 1 },
    { colors: ['red', 'yellow'], count: 2, value: 1 },
    { colors: ['railroad', 'utility'], count: 2, value: 1 },
    { colors: 'any', count: 3, value: 3 }
];

const WILD_PROPERTIES = [
    { colors: ['darkBlue', 'green'], count: 1, value: 4 },
    { colors: ['lightBlue', 'brown'], count: 1, value: 1 },
    { colors: ['orange', 'pink'], count: 2, value: 2 },
    { colors: ['green', 'railroad'], count: 1, value: 4 },
    { colors: ['lightBlue', 'railroad'], count: 1, value: 4 },
    { colors: ['utility', 'railroad'], count: 1, value: 2 },
    { colors: ['yellow', 'red'], count: 2, value: 3 },
    { colors: 'any', count: 2, value: 0 } // Multi-color wild has 0 value in MD
];

class Card {
    constructor(id, type, data) {
        this.id = id;
        this.type = type; // 'property', 'action', 'money', 'rent', 'wild'
        this.data = data;
        this.name = data.name || this.generateName();
        this.value = data.value || 0;
    }

    generateName() {
        if (this.type === 'property') return this.data.propertyName;
        if (this.type === 'money') return `$${this.data.value}M Money`;
        return this.data.name;
    }
}

class GameEngine {
    constructor() {
        this.deck = [];
        this.discardPile = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.status = 'LOBBY'; // LOBBY, PLAYING, ENDED
        this.turnMovesLeft = 3;
        this.logs = [];
    }

    initializeDeck() {
        let id = 1;
        this.deck = [];

        // Properties
        for (const [color, config] of Object.entries(PROPERTY_CONFIG)) {
            config.properties.forEach(propName => {
                this.deck.push(new Card(id++, 'property', {
                    propertyName: propName,
                    color: color,
                    value: config.values[0] // Simplified, usually constant per set color
                }));
            });
        }

        // Action Cards
        for (const [key, config] of Object.entries(ACTION_CARDS)) {
            for (let i = 0; i < config.count; i++) {
                this.deck.push(new Card(id++, 'action', { actionType: key, ...config }));
            }
        }

        // Money Cards
        MONEY_CARDS.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                this.deck.push(new Card(id++, 'money', { value: config.value }));
            }
        });

        // Rent Cards
        RENT_CARDS.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                this.deck.push(new Card(id++, 'rent', { ...config }));
            }
        });

        // Wild Properties
        WILD_PROPERTIES.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                this.deck.push(new Card(id++, 'wild', { ...config }));
            }
        });

        this.shuffle(this.deck);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    addPlayer(name, id) {
        this.players.push({
            id: id,
            name: name,
            hand: [],
            bank: [],
            properties: {
                brown: [], lightBlue: [], pink: [], orange: [],
                red: [], yellow: [], green: [], darkBlue: [],
                railroad: [], utility: []
            },
            propertyWilds: [], // Wilds that are currently assigned to a slot
            isAI: false
        });
    }

    start() {
        this.initializeDeck();
        this.status = 'PLAYING';
        this.players.forEach(p => {
            for (let i = 0; i < 5; i++) {
                p.hand.push(this.drawCard());
            }
        });
        this.beginTurn();
    }

    drawCard() {
        if (this.deck.length === 0) {
            this.deck = [...this.discardPile];
            this.discardPile = [];
            this.shuffle(this.deck);
        }
        return this.deck.pop();
    }

    beginTurn() {
        const player = this.players[this.currentPlayerIndex];
        this.turnMovesLeft = 3;

        // Draw 2 cards (or 5 if hand is empty) - Official rule: if you have 0 cards at start of turn, draw 5.
        const cardsToDraw = player.hand.length === 0 ? 5 : 2;
        for (let i = 0; i < cardsToDraw; i++) {
            player.hand.push(this.drawCard());
        }

        this.log(`${player.name}'s turn starts.`);
    }

    playCard(playerId, cardId, mode, targetData = {}) {
        if (this.status !== 'PLAYING') return;
        if (this.players[this.currentPlayerIndex].id !== playerId) return;
        if (this.turnMovesLeft <= 0) return;

        const player = this.players[this.currentPlayerIndex];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = player.hand[cardIndex];
        let success = false;

        switch (mode) {
            case 'bank':
                player.bank.push(card);
                player.hand.splice(cardIndex, 1);
                success = true;
                this.log(`${player.name} put ${card.name} into the bank.`);
                break;
            case 'property':
                if (card.type === 'property' || card.type === 'wild') {
                    const color = targetData.color || (card.type === 'property' ? card.data.color : null);
                    if (color) {
                        player.properties[color].push(card);
                        player.hand.splice(cardIndex, 1);
                        success = true;
                        this.log(`${player.name} played ${card.name} as a property.`);
                    }
                }
                break;
            case 'action':
                if (card.type === 'action' || card.type === 'rent') {
                    // Logic for specific action cards would go here
                    // For now, move to discard
                    this.discardPile.push(card);
                    player.hand.splice(cardIndex, 1);
                    this.handleActionEffect(player, card, targetData);
                    success = true;
                }
                break;
        }

        if (success) {
            this.turnMovesLeft--;
            this.checkWinCondition();
        }
    }

    handleActionEffect(player, card, targetData) {
        const action = card.data.actionType;
        this.log(`${player.name} played ${card.name}.`);

        switch (action) {
            case 'PASS_GO':
                for (let i = 0; i < 2; i++) {
                    player.hand.push(this.drawCard());
                }
                this.log(`${player.name} drew 2 extra cards.`);
                break;

            case 'ITS_MY_BIRTHDAY':
                this.players.forEach(p => {
                    if (p.id !== player.id) {
                        this.transferFunds(p, player, 2);
                    }
                });
                break;

            case 'RENT':
                const colors = card.data.colors;
                const rentColor = targetData.selectedColor || (Array.isArray(colors) ? colors[0] : null);
                if (rentColor) {
                    let rentAmount = this.calculateRent(player, rentColor);
                    if (targetData.isDouble) rentAmount *= 2;

                    this.players.forEach(p => {
                        if (p.id !== player.id) {
                            this.transferFunds(p, player, rentAmount);
                        }
                    });
                }
                break;

            case 'DEBT_COLLECTOR':
                const target = this.players.find(p => p.id === targetData.targetPlayerId);
                if (target) {
                    this.transferFunds(target, player, 2);
                }
                break;

            case 'SLY_DEAL':
                const slyTarget = this.players.find(p => p.id === targetData.targetPlayerId);
                const prop = this.removeProperty(slyTarget, targetData.color, targetData.propertyId);
                if (prop) {
                    player.properties[targetData.color].push(prop);
                    this.log(`${player.name} stole ${prop.name} from ${slyTarget.name}.`);
                }
                break;
        }
    }

    transferFunds(from, to, amount) {
        let remaining = amount;

        // Auto-pay from bank first
        while (remaining > 0 && from.bank.length > 0) {
            const bill = from.bank.pop();
            to.bank.push(bill);
            remaining -= bill.value;
            this.log(`${from.name} paid ₹${bill.value}M to ${to.name}.`);
        }

        // Then from properties if needed (Simplified)
        if (remaining > 0) {
            for (const color in from.properties) {
                while (remaining > 0 && from.properties[color].length > 0) {
                    const prop = from.properties[color].pop();
                    to.properties[color].push(prop);
                    remaining -= prop.value;
                    this.log(`${from.name} gave property ${prop.name} to ${to.name} as payment.`);
                }
            }
        }
    }

    removeProperty(player, color, cardId) {
        const idx = player.properties[color].findIndex(p => p.id === cardId);
        if (idx !== -1) {
            // Check if it's a full set
            if (player.properties[color].length >= PROPERTY_CONFIG[color].count) {
                this.log(`Cannot steal from a completed set!`);
                return null;
            }
            return player.properties[color].splice(idx, 1)[0];
        }
        return null;
    }

    calculateRent(player, color) {
        if (color === 'any') return 0; // Handled by selectedColor
        const count = player.properties[color].length;
        if (count === 0) return 0;

        const config = PROPERTY_CONFIG[color];
        const baseRent = config.rent[Math.min(count, config.count) - 1];

        // Add House/Hotel (if any)
        // Note: Houses/Hotels are handled separately in MD cards, usually as child items 
        // For now, let's keep it simple.
        return baseRent;
    }

    checkWinCondition() {
        const player = this.players[this.currentPlayerIndex];
        let completedSets = 0;
        for (const [color, props] of Object.entries(player.properties)) {
            if (props.length >= PROPERTY_CONFIG[color].count) {
                completedSets++;
            }
        }
        if (completedSets >= 3) {
            this.status = 'ENDED';
            this.log(`${player.name} WINS!`);
        }
    }

    endTurn(playerId) {
        if (this.players[this.currentPlayerIndex].id !== playerId) return;

        // Hand size check (7 cards max)
        const player = this.players[this.currentPlayerIndex];
        if (player.hand.length > 7) {
            // Must discard down to 7
            return { error: 'DISCARD_REQUIRED' };
        }

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.beginTurn();
    }

    log(msg) {
        this.logs.push(msg);
        console.log(msg);
    }
}

// In a real app, this might be exported for browser/node
if (typeof module !== 'undefined') {
    module.exports = { GameEngine, PROPERTY_CONFIG, ACTION_CARDS };
}
