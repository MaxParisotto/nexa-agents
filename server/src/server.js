











new MetricsHandler(io);// Initialize metrics handler});    }        methods: ["GET", "POST"]        origin: "*",    cors: {const io = require('socket.io')(server, {// After setting up your Express app and Socket.IOconst MetricsHandler = require('./websocket/MetricsHandler');