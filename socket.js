const { Server } = require('socket.io');
const { addPlayerToGame } = require('./game/gameManager');

const playerSocketMap = new Map(); // Map playerName -> socket.id

function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on('connection', (socket) => {
    console.log('Client connecté:', socket.id);
    handleNewConnection(socket, io);
  });
}

function handleNewConnection(socket, io) {
  console.log('Nouveau joueur connecté:', socket.id);

  socket.on('joinGame', ({ gameId, playerName }) => {
    try {
      const numericGameId = Number(gameId);

      // Stocker la correspondance joueur <-> socket
      playerSocketMap.set(playerName, socket.id);

      
      const game = addPlayerToGame(numericGameId, playerName);

      

      // Ajouter la socket à la "room" correspondant à la partie
      socket.join(`game_${numericGameId}`);

      // Émettre à tous les joueurs dans la room la liste mise à jour
      io.to(`game_${numericGameId}`).emit('updatePlayers', game.players);

      // Si partie démarrée, envoyer le rôle assigné individuellement
      if (game.status === 'started') {
        game.players.forEach(({ player, role }) => {
          const playerSocketId = playerSocketMap.get(player);
          if (playerSocketId) {
            io.to(playerSocketId).emit('roleAssigned', { role });
          }
        });
      }

      // Confirmer au joueur qui vient de rejoindre
      socket.emit('joinedGame', { game });
    } catch (error) {
      socket.emit('errorMessage', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Joueur déconnecté', socket.id);
    for (const [player, id] of playerSocketMap.entries()) {
      if (id === socket.id) {
        playerSocketMap.delete(player);
        break;
      }
    }
  });
}


module.exports = {
  setupSocket,       // EXPORTS setupSocket pour l’import dans index.js
  handleNewConnection, // Si tu veux aussi l’exporter (optionnel)
};
