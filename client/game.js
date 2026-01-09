/**
 * Hari Deal - UI & Interaction Logic
 */

let game = null;
let myPlayerId = 'p1';
let selectedMode = 'solo';
let socket = null;
const SERVER_URL = 'ws://localhost:8080';

// UI Elements
const screens = {
    menu: document.getElementById('menu-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

function showScreen(screenId, mode = null) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');

    if (mode) selectedMode = mode;

    if (screenId === 'lobby-screen') {
        setupLobby();
    }
}

function setupLobby() {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '<div class="player-slot">You (Ready)</div>';

    if (selectedMode === 'solo') {
        document.getElementById('lobby-title').innerText = 'Solo Game';
        playerList.innerHTML += '<div class="player-slot">Namma AI (Opponent)</div>';
    } else if (selectedMode === 'local') {
        document.getElementById('lobby-title').innerText = 'Local Pass-and-Play';
        playerList.innerHTML += '<div class="player-slot">Friend (Waiting)</div>';
    } else if (selectedMode === 'online-host') {
        document.getElementById('lobby-title').innerText = 'Online Lobby';
        document.getElementById('room-info').classList.remove('hidden');
        connectToSocket('CREATE_ROOM');
    }
}

function promptRoomCode() {
    const code = prompt('Enter Room Code:');
    if (code) {
        selectedMode = 'online-join';
        showScreen('lobby-screen');
        connectToSocket('JOIN_ROOM', code);
    }
}

function connectToSocket(action, roomCode = null) {
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        const name = prompt('Enter your name:') || 'Player';
        const payload = { type: action, name, roomCode };
        socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSocketMessage(data);
    };
}

function handleSocketMessage(data) {
    switch (data.type) {
        case 'ROOM_CREATED':
            myPlayerId = data.playerId;
            document.getElementById('display-room-code').innerText = data.roomCode;
            break;
        case 'ROOM_JOINED':
            myPlayerId = data.playerId;
            document.getElementById('display-room-code').innerText = data.roomCode;
            document.getElementById('room-info').classList.remove('hidden');
            break;
        case 'PLAYER_JOINED':
            updateLobbyList(data.players);
            break;
        case 'GAME_STARTED':
            syncState(data.state);
            showScreen('game-screen');
            break;
        case 'STATE_UPDATE':
            syncState(data.state);
            break;
    }
}

function updateLobbyList(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => `<div class="player-slot">${p.name} ${p.id === myPlayerId ? '(You)' : ''}</div>`).join('');
}

function syncState(state) {
    // Basic sync - in a full implementation, we'd update the engine
    // For now, we'll just re-render based on server data
    renderRemoteGame(state);
}

function renderRemoteGame(state) {
    // Custom render logic for remote state
    // ...
}

function startGame() {
    if (selectedMode.startsWith('online')) {
        socket.send(JSON.stringify({ type: 'START_GAME' }));
        return;
    }
    game = new GameEngine();

    if (selectedMode === 'solo') {
        game.addPlayer('You', 'p1');
        game.addPlayer('Namma AI', 'ai1');
        game.players[1].isAI = true;
    } else if (selectedMode === 'local') {
        game.addPlayer('Player 1', 'p1');
        game.addPlayer('Player 2', 'p2');
    }

    game.start();
    showScreen('game-screen');
    renderGame();
}

function renderGame() {
    const player = game.players.find(p => p.id === myPlayerId);
    const opponent = game.players.find(p => p.id !== myPlayerId);

    // Update stats
    document.getElementById('moves-left').innerText = game.turnMovesLeft;
    document.getElementById('bank-total').innerText = `₹${getTotalValue(player.bank)}M`;
    document.getElementById('sets-count').innerText = `${countCompletedSets(player)}/3`;
    document.getElementById('deck-count').innerText = game.deck.length;

    // Render Hand
    const handEl = document.getElementById('hand');
    handEl.innerHTML = '';
    player.hand.forEach(card => {
        const cardEl = createCardElement(card);
        cardEl.onclick = () => openActionOverlay(card);
        handEl.appendChild(cardEl);
    });

    // Render My Properties
    renderProperties('my-properties', player);

    // Render Opponent (Simplified for 2 player)
    const oppArea = document.getElementById('opponents-area');
    oppArea.innerHTML = '';
    const oppEl = document.createElement('div');
    oppEl.className = 'opponent-board';
    oppEl.innerHTML = `
        <div class="opp-info">${opponent.name} | Hand: ${opponent.hand.length} | Bank: ₹${getTotalValue(opponent.bank)}M</div>
        <div class="property-grid" id="opp-properties"></div>
    `;
    oppArea.appendChild(oppEl);
    renderProperties('opp-properties', opponent);

    // Enable/Disable End Turn
    const endTurnBtn = document.getElementById('end-turn-btn');
    endTurnBtn.disabled = game.players[game.currentPlayerIndex].id !== myPlayerId;

    // Log update
    const logsEl = document.getElementById('game-logs');
    logsEl.innerHTML = '';
    game.logs.slice(-5).forEach(log => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerText = log;
        logsEl.appendChild(entry);
    });
    logsEl.scrollTop = logsEl.scrollHeight;

    // AI Turn?
    if (game.status === 'PLAYING' && game.players[game.currentPlayerIndex].isAI) {
        setTimeout(handleAITurn, 1000);
    }
}

function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card anim-draw';

    let color = '#fff';
    let typeLabel = '';

    if (card.type === 'property') {
        color = PROPERTY_CONFIG[card.data.color].color;
        typeLabel = 'Property';
    } else if (card.type === 'action') {
        color = '#eee';
        typeLabel = 'Action';
    } else if (card.type === 'money') {
        color = '#d4edda';
        typeLabel = 'Money';
    } else if (card.type === 'rent') {
        color = '#fff3cd';
        typeLabel = 'Rent';
    } else if (card.type === 'wild') {
        color = 'linear-gradient(45deg, #f06, #4a90e2)';
        typeLabel = 'Wild Property';
    }

    div.innerHTML = `
        <div class="card-value-badge">${card.value}</div>
        <div class="card-header" style="background: ${color}">${typeLabel}</div>
        <div class="card-body">
            <div class="card-title">${card.name}</div>
            <div class="card-text">${card.data.text || ''}</div>
        </div>
    `;
    return div;
}

function renderProperties(containerId, player) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const [color, props] of Object.entries(player.properties)) {
        if (props.length > 0) {
            const setDiv = document.createElement('div');
            setDiv.className = 'property-set';
            setDiv.style.borderTop = `4px solid ${PROPERTY_CONFIG[color].color}`;

            props.forEach(p => {
                const pEl = document.createElement('div');
                pEl.className = 'prop-mini';
                pEl.innerText = p.name;
                pEl.style.fontSize = '0.7rem';
                setDiv.appendChild(pEl);
            });

            if (props.length >= PROPERTY_CONFIG[color].count) {
                setDiv.classList.add('completed');
            }

            container.appendChild(setDiv);
        }
    }
}

function getTotalValue(cards) {
    return cards.reduce((sum, c) => sum + (c.value || 0), 0);
}

function countCompletedSets(player) {
    let count = 0;
    for (const [color, props] of Object.entries(player.properties)) {
        if (props.length >= PROPERTY_CONFIG[color].count) count++;
    }
    return count;
}

// Action Overlay
let activeCard = null;
function openActionOverlay(card) {
    if (game.players[game.currentPlayerIndex].id !== myPlayerId) return;
    if (game.turnMovesLeft <= 0) return;

    activeCard = card;
    const overlay = document.getElementById('action-overlay');
    const actionsEl = document.getElementById('overlay-actions');
    overlay.classList.remove('hidden');

    document.getElementById('overlay-title').innerText = card.name;
    actionsEl.innerHTML = '';

    // Standard buttons
    const bankBtn = document.createElement('button');
    bankBtn.className = 'btn-secondary';
    bankBtn.innerText = 'Play to Bank';
    bankBtn.onclick = () => handlePlay('bank');
    actionsEl.appendChild(bankBtn);

    if (card.type === 'property' || card.type === 'wild') {
        const propBtn = document.createElement('button');
        propBtn.className = 'btn-primary';
        propBtn.innerText = 'Play as Property';
        propBtn.onclick = () => handlePlay('property');
        actionsEl.appendChild(propBtn);
    }

    if (card.type === 'action' || card.type === 'rent') {
        const actBtn = document.createElement('button');
        actBtn.className = 'btn-accent';
        actBtn.innerText = 'Use Action';
        actBtn.onclick = () => handlePlay('action');
        actionsEl.appendChild(actBtn);
    }
}

function closeOverlay() {
    document.getElementById('action-overlay').classList.add('hidden');
}

function handlePlay(mode) {
    if (selectedMode.startsWith('online')) {
        socket.send(JSON.stringify({
            type: 'PLAY_CARD',
            playerId: myPlayerId,
            cardId: activeCard.id,
            mode: mode
        }));
    } else {
        game.playCard(myPlayerId, activeCard.id, mode);
        renderGame();
    }
    closeOverlay();
    showToast(`${activeCard.name} played!`);
}

function handleEndTurn() {
    if (selectedMode.startsWith('online')) {
        socket.send(JSON.stringify({
            type: 'END_TURN',
            playerId: myPlayerId
        }));
    } else {
        const res = game.endTurn(myPlayerId);
        if (res && res.error === 'DISCARD_REQUIRED') {
            showToast('Must discard down to 7 cards!', 'error');
            return;
        }
        renderGame();
    }
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// AI logic (Simplified)
function handleAITurn() {
    const ai = game.players[game.currentPlayerIndex];
    if (!ai.isAI) return;

    if (game.turnMovesLeft > 0 && ai.hand.length > 0) {
        const card = ai.hand[0];
        let mode = 'bank';
        if (card.type === 'property' || card.type === 'wild') mode = 'property';

        game.playCard(ai.id, card.id, mode);
        renderGame();
    } else {
        game.endTurn(ai.id);
        renderGame();
    }
}
