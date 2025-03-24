import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { extractJwtToken } from './auth/auth'
import { userManager } from './manager/users/UserManager'
import dotenv from 'dotenv'

const app = express()


const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin (adjust as needed for production)
        methods: ["GET", "POST"], // Allow only specific HTTP methods
    }
})
app.get("/",async(_,res)=>{
    const onlineUserSize = userManager.getUserCount();
    if(onlineUserSize > 10000) return onlineUserSize
        const randomValue = Math.floor(Math.random() * (150000 - 100000 + 1)) + 100000;
    return res.status(200).json({count: randomValue});
})

io.on('connection', (socket) => {
    socket.send('Connected to socket server')
    socket.on('ADD_USER', (data) => {
        const token = data;
        if(!token){
            const message = 'Token not found'
            socket.emit('DISCONNECT_USER', message)
            return
        }
        const user = extractJwtToken(token, socket)
        if(!user){
            const message = 'Invalid Token'
            socket.emit('DISCONNECT_USER', message)
            return
        }
        userManager.addUser(user);
    })
    
    socket.on('disconnect', () => {
        console.log("Disconnecting user");
        userManager.removeUser(socket.id)
    });
})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log(`Websocket server is running on port ${PORT}`)
})

