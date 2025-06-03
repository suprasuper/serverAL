const { Server } = require('socket.io');
const { addPlayerToGame, startGame, getGameById, removePlayerFromGames, startRobotAudioLoop, stopRobotAudioLoop } = require('./game/gameManager');

const playerSocketMap = new Map(); // Map playerName -> socket.id

//Connexion a la socket
function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on('connection', (socket) => {
    console.log('Client connecté:', socket.id);
    handleNewConnection(socket, io);
  });
}

//Ma fonction qui va créer tout les listener sur la socket
function handleNewConnection(socket, io) {
  console.log('Nouveau joueur connecté:', socket.id);

  //Quand on rejoins le lobby
  socket.on('joinGame', ({ gameId, playerName, playerId, avatar }) => {
    try {
      const numericGameId = Number(gameId);

      const game = addPlayerToGame(numericGameId, playerId, playerName, avatar);


      // Stocker la correspondance playerId -> socket.id
      playerSocketMap.set(playerId, socket.id);


      // Ajouter la socket à la room de la partie
      socket.join(`game_${numericGameId}`);
      // Envoyer à tous les joueurs la liste mise à jour
      io.to(`game_${numericGameId}`).emit('updatePlayers', game.players);


      // Confirmer au joueur qui rejoint
      socket.emit('joinedGame', { game });
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      socket.emit('errorMessage', error.message);
    }
  });

  //Quand on quitte le lobby
  socket.on("leaveLobby", ({ gameId, playerId }) => {
    const numericGameId = Number(gameId);
    const game = getGameById(numericGameId);
    if (!game) {
      socket.emit("errorMessage", "Partie introuvable");
      return;
    }
    // Supprimer le joueur de la partie
    game.players = game.players.filter(p => p.playerId !== playerId);
    // Supprimer le mapping socket
    playerSocketMap.delete(playerId);
    // Quitter la room
    socket.leave(`game_${numericGameId}`);
    // Notifier tous les autres joueurs
    io.to(`game_${numericGameId}`).emit("updatePlayers", game.players);
    // Optionnel : supprimer la partie si plus personne dedans
    // if (game.players.length === 0) {
    //   deleteGame(numericGameId); 
    // }
  });

  //Quand on se deconnecte (onglet ou nav fermé)
  socket.on("disconnect", () => {
    console.log("Joueur déconnecté", socket.id);

    let playerIdToRemove;
    for (const [playerId, id] of playerSocketMap.entries()) {
      if (id === socket.id) {
        playerIdToRemove = playerId;
        playerSocketMap.delete(playerId);
        break;
      }
    }

    if (!playerIdToRemove) return;

    const result = removePlayerFromGames(playerIdToRemove);

    if (result) {
      const { gameId, updatedPlayers } = result;

      // Notifie les autres joueurs de la mise à jour
      io.to(`game_${gameId}`).emit("updatePlayers", updatedPlayers);
    }
  });

  //Quand on commence la partie(distrubtion role)
  socket.on('startGame', ({ gameId }) => {
    try {
      const numericGameId = Number(gameId);
      const game = getGameById(numericGameId);
      if (!game) {
        socket.emit('errorMessage', 'Partie introuvable');
        return;
      }
      // Vérifie que la partie contient bien 5 joueurs
      if (game.players.length !== 5) {
        socket.emit('errorMessage', 'La partie doit contenir exactement 5 joueurs pour commencer');
        return;
      }
      // Démarre la partie
      const updatedGame = startGame(numericGameId);
      // Envoie les rôles à chaque joueur
      updatedGame.players.forEach(({ playerId, role }) => {
        const playerSocketId = playerSocketMap.get(playerId);
        if (playerSocketId) {
          io.to(playerSocketId).emit('roleAssigned', { role });
        }
      });
      // Notifie tout le monde que la partie commence
      io.to(`game_${numericGameId}`).emit('gameStarted', updatedGame);
    } catch (error) {
      console.error("Erreur dans 'startGame':", error.message);
      socket.emit('errorMessage', error.message);
    }
  });

  //Quand on commence le chrono (on est dans la faille)
  socket.on('startChrono', ({ gameId }) => {

    const numericGameId = Number(gameId);
    console.log("Chrono start pour la partie : ", numericGameId)
    const game = getGameById(numericGameId);

    game.startTime = Date.now();
    if (!game) {
      socket.emit('errorMessage', 'Partie introuvable');
      return;
    }

    startRobotAudioLoop(numericGameId, io, playerSocketMap);
  });

}



module.exports = {
  setupSocket,       // EXPORTS setupSocket pour l'import dans index.js
  handleNewConnection, // Si tu veux aussi l'exporter (optionnel)
};
