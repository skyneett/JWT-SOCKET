// Cargar variables de entorno desde .env
require('dotenv').config();
// Importar dependencias principales
const express = require('express'); // Framework web para Node.js
const http = require('http'); // Módulo para crear el servidor HTTP
const socketIo = require('socket.io'); // Librería para comunicación en tiempo real
const cors = require('cors'); // Middleware para habilitar CORS
const jwt = require('jsonwebtoken'); // Librería para manejar JWT

// Inicializar la app de Express
const app = express();
// Crear el servidor HTTP a partir de la app de Express
const server = http.createServer(app);
// Inicializar Socket.IO y permitir conexiones desde cualquier origen
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware globales
app.use(cors()); // Permitir solicitudes desde cualquier origen
app.use(express.json()); // Permitir recibir JSON en las peticiones

// Ruta para autenticación de usuarios (login)
app.post('/login', (req, res) => {
    const { username } = req.body;
    // En un caso real, aquí deberías validar el usuario y contraseña contra una base de datos
    if (username) {
        // Generar un token JWT con el nombre de usuario
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token }); // Devolver el token al cliente
    } else {
        res.status(401).json({ message: 'Credenciales inválidas' });
    }
});

// Middleware de autenticación para Socket.IO
// Se ejecuta antes de aceptar la conexión del socket
io.use((socket, next) => {
    const token = socket.handshake.auth.token; // Obtener el token enviado por el cliente
    if (!token) {
        return next(new Error('Autenticación requerida'));
    }
    try {
        // Verificar el token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Guardar los datos del usuario en el socket
        next(); // Permitir la conexión
    } catch (err) {
        next(new Error('Token inválido'));
    }
});

// Manejo de conexiones de clientes a través de Socket.IO
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.user.username}`);

    // Escuchar mensajes enviados por el cliente
    socket.on('message', (data) => {
        // Emitir el mensaje a todos los clientes conectados
        io.emit('message', {
            user: socket.user.username, // Usuario que envía el mensaje
            message: data.message, // Contenido del mensaje
            timestamp: new Date() // Fecha y hora
        });
    });

    // Evento cuando un usuario se desconecta
    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.user.username}`);
    });
});

// Iniciar el servidor en el puerto especificado en .env o 3000 por defecto
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
