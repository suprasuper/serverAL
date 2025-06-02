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
      console.log(`${playerName} tente de rejoindre la partie ${numericGameId}`);

      // Stocker la correspondance joueur <-> socket
      playerSocketMap.set(playerName, socket.id);
      console.log('Map des sockets mise à jour:', Array.from(playerSocketMap.entries()));

      // Ajouter la socket à la "room" correspondant à la partie
      socket.join(`game_${numericGameId}`);
      
      const game = addPlayerToGame(numericGameId, playerName);
      console.log(`État de la partie après ajout de ${playerName}:`, game);

      // Émettre à tous les joueurs dans la room la liste mise à jour
      io.to(`game_${numericGameId}`).emit('updatePlayers', game.players);

      // Émettre l'événement playerJoined
      io.to(`game_${numericGameId}`).emit('playerJoined', {
        players: game.players,
        gameId: numericGameId,
        newPlayer: playerName
      });

      // Si partie démarrée, envoyer le rôle assigné individuellement
      if (game.status === 'started') {
        console.log("La partie vient de démarrer, envoi des rôles...");
        game.players.forEach(({ player, role }) => {
          console.log(`Tentative d'envoi du rôle "${role}" à ${player}`);
          const playerSocketId = playerSocketMap.get(player);
          if (playerSocketId) {
            console.log(`Socket trouvé pour ${player}: ${playerSocketId}, envoi du rôle...`);
            io.to(playerSocketId).emit('roleAssigned', { role });
          } else {
            console.log(`⚠️ ERREUR: Socket non trouvé pour le joueur ${player}`);
          }
        });
      }

      // Confirmer au joueur qui vient de rejoindre
      socket.emit('joinedGame', { game });
    } catch (error) {
      console.error('Erreur lors du joinGame:', error);
      socket.emit('errorMessage', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Joueur déconnecté', socket.id);
    let leftPlayerName;
    
    for (const [player, id] of playerSocketMap.entries()) {
      if (id === socket.id) {
        leftPlayerName = player;
        playerSocketMap.delete(player);
        break;
      }
    }

    if (leftPlayerName) {
      // Émettre l'événement playerLeft
      for (const room of socket.rooms) {
        if (room.startsWith('game_')) {
          io.to(room).emit('playerLeft', {
            players: [], // La liste sera mise à jour côté client
            leftPlayer: leftPlayerName
          });
        }
      }
    }
  });
}


module.exports = {
  setupSocket,       // EXPORTS setupSocket pour l'import dans index.js
  handleNewConnection, // Si tu veux aussi l'exporter (optionnel)
};
