import { validateExit, validateInitGame, validateLudoMove, validateRoomId } from "../../zod/validateGame";
import { gameManager } from "../game/GameManager";
import { appManager } from "../main/AppManager";
import { roomManager } from "../room/RoomManager";
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
        this.addHandler(user)
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
    private addHandler(user: User){
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
            if(!data){
                const response = JSON.stringify({ message: 'Invalid data' })
                user.getSocket().emit('ROLL_ERROR', response)
                return
            }
            const roomId = data;
            const isValidRoll = validateRoomId.safeParse({roomId});
            if(!isValidRoll.success) return
            gameManager.fetchLudoGameAndRollDice(roomId, user.getSocket().id)
        })
        user.getSocket().on("MOVE_PIECE", async(data) => {
            if(!data){
                user.getSocket().emit("MOVE_ERROR", 'Invalid data')
            }
            const message = JSON.parse(data);
            const isValidMove = validateLudoMove.safeParse(message)
            if(!isValidMove.success) return 
            const {piece, roomId} = isValidMove.data;
            gameManager.fetchLudoGameAndMovePiece(roomId, user.getSocket().id, parseInt(piece));
            //call the move function

        })
        user.getSocket().on("MOVE_UPDATED", async(data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.getSocket().id);
            if(!roomId) return;
            gameManager.fetchLudoGameAndUpdateMove(roomId, user.getSocket().id);
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
}

export const userManager = UserManager.getInstance()
