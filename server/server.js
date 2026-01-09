const WebSocket = require('ws');
const { GameEngine } = require('../client/engine');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map(); // roomCode -> { players: [], game: GameEngine }

console.log(`Hari Deal Server running on port ${PORT}`);

wss.on('connection', (ws) => {
    let currentRoom = null;
    let playerId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'CREATE_ROOM':
                const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
                playerId = 'p1';
                const game = new GameEngine();
                rooms.set(roomCode, {
                    host: ws,
                    players: [{ id: playerId, name: data.name, ws }],
                    game: game
                });
                currentRoom = roomCode;
                ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode, playerId }));
                console.log(`Room created: ${roomCode}`);
                break;

            case 'JOIN_ROOM':
                const joinCode = data.roomCode.toUpperCase();
                const room = rooms.get(joinCode);
                if (room && room.players.length < 5) {
                    playerId = 'p' + (room.players.length + 1);
                    room.players.push({ id: playerId, name: data.name, ws });
                    currentRoom = joinCode;
                    ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomCode: joinCode, playerId }));
                    broadcastToRoom(joinCode, { type: 'PLAYER_JOINED', players: room.players.map(p => ({ name: p.name, id: p.id })) });
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room full or not found' }));
                }
                break;

            case 'START_GAME':
                if (currentRoom) {
                    const r = rooms.get(currentRoom);
                    r.players.forEach(p => r.game.addPlayer(p.name, p.id));
                    r.game.start();
                    broadcastToRoom(currentRoom, { type: 'GAME_STARTED', state: getGameState(r.game) });
                }
                break;

            case 'PLAY_CARD':
                if (currentRoom) {
                    const r = rooms.get(currentRoom);
                    r.game.playCard(data.playerId, data.cardId, data.mode, data.targetData);
                    broadcastToRoom(currentRoom, { type: 'STATE_UPDATE', state: getGameState(r.game) });
                }
                break;

            case 'END_TURN':
                if (currentRoom) {
                    const r = rooms.get(currentRoom);
                    r.game.endTurn(data.playerId);
                    broadcastToRoom(currentRoom, { type: 'STATE_UPDATE', state: getGameState(r.game) });
                }
                break;
        }
    });

    ws.on('close', () => {
        // Handle disconnection
    });
});

function broadcastToRoom(roomCode, message) {
    const room = rooms.get(roomCode);
    if (room) {
        const payload = JSON.stringify(message);
        room.players.forEach(p => p.ws.send(payload));
    }
}

function getGameState(game) {
    // Return a sanitized version of the game state for the clients
    return {
        players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            handCount: p.hand.length,
            bank: p.bank,
            properties: p.properties,
            hand: p.hand // In a real app, hide other players' hands
        })),
        currentPlayerIndex: game.currentPlayerIndex,
        turnMovesLeft: game.turnMovesLeft,
        status: game.status,
        deckCount: game.deck.length,
        logs: game.logs
    };
}
