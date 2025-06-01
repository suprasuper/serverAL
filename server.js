const http = require('http');
const app = require('./app');




const { setupSocket } = require('./socket');
const server = http.createServer(app);

setupSocket(server);

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';  // Écoute toutes les IPs de ta machine

server.listen(PORT, HOST, () => {
  console.log(`Serveur lancé sur http://${HOST}:${PORT}`);
});
