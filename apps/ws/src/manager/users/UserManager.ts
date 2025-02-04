import rateLimiter from "../../auth/redis";
import { validateExit, validateInitGame, validateLudoMove, validateRoomId } from "../../zod/validateGame";
import { gameManager } from "../game/GameManager";
import { appManager } from "../main/AppManager";
import { roomManager } from "../room/RoomManager";
import { socketManager } from "../socket/SocketManager";
import { User } from "./User";

class UserManager {
    private static instance: UserManager
    private readonly onlineUsers: Map<string, User>
    constructor(){
        this.onlineUsers = new Map()
    }
    static getInstance(){
        if(UserManager.instance){
            return UserManager.instance;
        }
        UserManager.instance = new UserManager();
        return UserManager.instance;
    }

    addUser(user: User) {
        this.addLudoHandler(user)
        this.addFastLudoHandler(user);
        this.addCricketHandler(user)
        this.onlineUsers.set(user.getSocket().id, user);
    }

    removeUser(socketId: string) {
        this.onlineUsers.delete(socketId)
    }

    getUser(socketId: string) {
        return this.onlineUsers.get(socketId)
    }
    getUserCount(){
        return this.onlineUsers.size
    }

    private getOnlinePlayers() {
        const onlineUserSize = this.onlineUsers.size;
        if(onlineUserSize > 10000) return onlineUserSize
        const randomValue = Math.floor(Math.random() * (150000 - 100000 + 1)) + 100000;
        return randomValue
    }
    private addLudoHandler(user: User){
        user.getSocket().on('GET_ONLINE_PLAYERS', () => {
            const onlineUserSize = this.getOnlinePlayers();
            user.getSocket().emit('ONLINE_PLAYERS', onlineUserSize)
        })
        user.getSocket().on('INIT_GAME', async(data: string) => {
            if(!data){
                const response = JSON.stringify({ message: 'Invalid data' })
                user.getSocket().emit('ROLL_ERROR', response)
                return
            }
            const gameId = data;
            const isValidInit = validateInitGame.safeParse({gameId});
            if(!isValidInit.success) return 
            await roomManager.createOrInsertIntoRoom(user, gameId)
        });
        user.getSocket().on('ROLL_DICE', async(data) => {
            const socketId = user.getSocket().id;
            if(!await rateLimiter.hasRollLimit(socketId)){
                console.log(`User ${socketId} have no  limit to roll dice`);
                return
            }
            if(!data){
                const response = JSON.stringify({ message: 'Invalid data' })
                user.getSocket().emit('ROLL_ERROR', response)
                return
            }
            const roomId = data;
            const isValidRoll = validateRoomId.safeParse({roomId});
            if(!isValidRoll.success) return
            gameManager.fetchLudoGameAndRollDice(roomId, socketId)
        })
        user.getSocket().on("MOVE_PIECE", async(data) => {
            const socketId = user.getSocket().id;
            if(!await rateLimiter.hasMakeMoveLimit(socketId)) {
                console.log(`User ${socketId} have no  limit to move piece`);
                return
            }
            if(!data){
                user.getSocket().emit("MOVE_ERROR", 'Invalid data')
            }
            const message = JSON.parse(data);
            const isValidMove = validateLudoMove.safeParse(message)
            if(!isValidMove.success) return 
            const {piece, roomId} = isValidMove.data;
            gameManager.fetchLudoGameAndMovePiece(roomId, socketId, parseInt(piece));
            //call the move

        })
        user.getSocket().on("MOVE_UPDATED", async(data) => {
            const socketId = user.getSocket().id;
            console.log(`Move Updated called by ${socketId}`);
            if(!await rateLimiter.hasMoveUpdateLimit(socketId)) return;
            const roomId = appManager.getUserToRoomMapping().get(socketId);
            if(!roomId) return;
            gameManager.fetchLudoGameAndUpdateMove(roomId, socketId);
        })
        user.getSocket().on("TURN_UPDATED", async(data) => {
            const socketId = user.getSocket().id;
            if(!await rateLimiter.handleForceUpdateMove()) return;
            console.log("Next Turn issued by socketId: " + socketId);
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchLudoGameAndUpdateTurn(roomId, socketId);
        })
        
        // user.getSocket().on('EXIT_GAME', async(data: string) => {
        //     const message = JSON.parse(data);
        //     if(!message){
        //         const response = JSON.stringify({ message: 'Invalid data' })
        //         user.getSocket().emit('EXIT_ERROR', response)
        //         return
        //     }
        //     const isValidExit = validateExit.safeParse(message);
        //     if(!isValidExit.success) return 
        //     const {roomId} = isValidExit.data
        //     roomManager.exitRoom(user, roomId)
        // })
    }

    private addFastLudoHandler(user: User){
        user.getSocket().on('TIME_UP', (data) => {
            const socketId = user.getSocket().id;
            console.log("Next Turn issued by socketId: " + socketId);
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchFastLudoGameAndEndGame(roomId);
        })
    }

    private addCricketHandler(user: User){
        user.getSocket().on("BOWLER_RUN", (data) => {
            if(!data) return
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "BOWLER_RUN", data);
        });

        user.getSocket().on("MOVE_BATSMAN", (data) => {
            if(!data) return
            console.log("Moving Batsman: " + data);
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "MOVE_BATSMAN", data);
        })

        user.getSocket().on("CRICKET_IDLE", (data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            socketManager.emitToOthers(roomId, "CRICKET_IDLE", data, user.getSocket().id);
        })

        user.getSocket().on("BALL_HIT_POSITION", (data) => {
            if(!data) return
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "BALL_HIT_POSITION", data);
        })

        user.getSocket().on("GROUND_TARGET_MOVE", (data) => {
            if(!data) return
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "GROUND_TARGET_MOVE", data);
        })

        user.getSocket().on("BATSMAN_HIT", (data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndBatsmanHit(roomId, user.getSocket().id);
            // socketManager.broadcastToRoom(roomId, "GROUND_TARGET_MOVE", data);
        })


        user.getSocket().on("UPDATE_SCORE", (data) => {
            try {
                if(!data) return
                const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
                if(!roomId) return;
                const score = parseInt(data);
                gameManager.fetchCricketGameAndUpdateScore(roomId, user.getSocket().id, score);

            } catch (error) {
                return;
            }
        });

        user.getSocket().on("WICKET", () => {
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndHitWicket(roomId, user.getSocket().id);
        })

        user.getSocket().on("RESET_BOWLER", (data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndResetBowler(roomId, user.getSocket().id);
        })

        user.getSocket().on("RESET_BATSMAN", (data) => {
            console.log("Reset the batsman");
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndResetBatsMan(roomId, user.getSocket().id);
        })

        

    }
}

export const userManager = UserManager.getInstance()
