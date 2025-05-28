import { AVOID_SWITCH_PLAYER, EXIT_ROOM, MATCH_MAKING, MOVE_PLAYER, ON_PLAYER_WIN, PLAYER_FINISHED_MOVING, ROLL_DICE, SWITCH_PLAYER } from "../../messages/ludomessage";
import { validateInitGame, validateLudoMove, validateMemoryPick, validateRoomId } from "../../zod/validateGame";
import { gameManager } from "../game/GameManager";
import { appManager } from "../main/AppManager";
import { roomManager } from "../room/RoomManager";
import { socketManager } from "../socket/SocketManager";
import { User } from "./User";
import z from 'zod'

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
        this.addCricketHandler(user);
        this.addMemoryListener(user);
        this.addGameHandler(user)
        this.onlineUsers.set(user.socket.id, user);
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

    private addGameHandler(user: User){
        user.socket.on('INIT_GAME', async(data: string) => {
            if(!data){
                const response = JSON.stringify({ message: 'Invalid data' })
                user.socket.emit('INIT_ERROR', response)
                return
            }
            const gameId = data;
            const isValidInit = validateInitGame.safeParse({gameId});
            if(!isValidInit.success) return 
            await roomManager.createOrInsertIntoRoom(user, gameId)
        });

        user.socket.on('GET_ONLINE_PLAYERS', () => {
            const onlineUserSize = this.getOnlinePlayers();
            user.socket.emit('ONLINE_PLAYERS', onlineUserSize)
        });
        user.socket.on('QUIT_ROOM', async(data: string) => {
            const socketId = user.socket.id;
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            roomManager.quitRoom(roomId, socketId);
        })
    }
    private addLudoHandler(user: User){
        user.socket.on(ROLL_DICE, (call) => {
            const data = JSON.parse(call)
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            const isValidRoll = z.object({ diceValue: z.number()}).safeParse(data)
            if(!isValidRoll.success) return;
            const diceValue = isValidRoll.data.diceValue
            gameManager.fetchLudoGameAndRollDice(roomId, user.socket.id, diceValue);
        });



        user.socket.on(PLAYER_FINISHED_MOVING, (call) => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            const data = JSON.parse(call)
            const isValidFinish = z.object({richedTheDestination: z.boolean(), diceValue: z.number()}).safeParse(data)
            if(!isValidFinish.success) return;
            const richedTheDestination = isValidFinish.data.richedTheDestination
            if(!roomId) return;
            gameManager.fetchLudoGameAndFinishMoving(roomId, user.socket.id, isValidFinish.data.diceValue,  richedTheDestination);
        })

        user.socket.on(SWITCH_PLAYER, (call) => {
            const data = JSON.parse(call)
            const isValidSwitch = z.object({diceValue: z.number()}).safeParse(data);
            if(!isValidSwitch.success) return;
            const diceValue = isValidSwitch.data.diceValue
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchLudoGameAndSwitchPlayer(roomId, user.socket.id, diceValue);
        });

        user.socket.on(AVOID_SWITCH_PLAYER, (call) => {
            const data = JSON.parse(call)
            const isValidAvoid = z.object({diceValue: z.number()}).safeParse(data);
            if(!isValidAvoid.success) return;
            const diceValue = isValidAvoid.data.diceValue
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;

            gameManager.fetchLudoGameAndAvoidSwitchPlayer(roomId, user.socket.id, diceValue);
        });

        user.socket.on(MOVE_PLAYER, (call) => {
            const data = JSON.parse(call)
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            const isValidMove = z.object({
                pawnNo: z.number(),
                diceValue: z.number()
            }).safeParse(data);
            if(!isValidMove.success) return;
            const pawn = isValidMove.data.pawnNo;
            gameManager.fetchLudoGameAndMovePlayer(roomId, user.socket.id, pawn, isValidMove.data.diceValue);
        })

        user.socket.on(ON_PLAYER_WIN, () => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchLudoGameAndPlayerWin(roomId, user.socket.id);
        })

        user.socket.on(EXIT_ROOM, () => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchLudoGameAndExitRoom(roomId, user.socket.id);
        })

        user.socket.on('disconnect', () => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchLudoGameAndExitRoom(roomId, user.socket.id);
        })
    }

    private addFastLudoHandler(user: User){
        user.socket.on('TIME_UP', (data) => {
            const socketId = user.socket.id;
            console.log("Next Turn issued by socketId: " + socketId);
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchFastLudoGameAndEndGame(roomId);
        })
    }

    private addCricketHandler(user: User){
        user.socket.on("BOWLER_RUN", (data) => {
            if(!data) return
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "BOWLER_RUN", data);
        });

        user.socket.on("MOVE_BATSMAN", (data) => {
            if(!data) return
            console.log("Moving Batsman: " + data);
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "MOVE_BATSMAN", data);
        })

        user.socket.on("CRICKET_IDLE", (data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            socketManager.emitToOthers(roomId, "CRICKET_IDLE", data, user.socket.id);
        })

        user.socket.on("BALL_HIT_POSITION", (data) => {
            if(!data) return
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "BALL_HIT_POSITION", data);
        })

        user.socket.on("GROUND_TARGET_MOVE", (data) => {
            if(!data) return
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            socketManager.broadcastToRoom(roomId, "GROUND_TARGET_MOVE", data);
        })

        user.socket.on("BATSMAN_HIT", (data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndBatsmanHit(roomId, user.socket.id);
            // socketManager.broadcastToRoom(roomId, "GROUND_TARGET_MOVE", data);
        })


        user.socket.on("UPDATE_SCORE", (data) => {
            try {
                if(!data) return
                const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
                if(!roomId) return;
                const score = parseInt(data);
                gameManager.fetchCricketGameAndUpdateScore(roomId, user.socket.id, score);

            } catch (error) {
                return;
            }
        });

        user.socket.on("WICKET", () => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndHitWicket(roomId, user.socket.id);
        })

        user.socket.on("RESET_BOWLER", (data) => {
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndResetBowler(roomId, user.socket.id);
        })

        user.socket.on("RESET_BATSMAN", (data) => {
            console.log("Reset the batsman");
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchCricketGameAndResetBatsMan(roomId, user.socket.id);
        })
    }

    private addMemoryListener(user: User){
        user.socket.on("PICK_CARD", (data) => {
            try {
                const isValidPick = validateMemoryPick.safeParse(data);
                if(!isValidPick.success) return;
                const index = parseInt(isValidPick.data);
                const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
                if(!roomId) return;
                gameManager.fetchMemoryGameAndPickCard(roomId, user.socket.id, index);
            } catch (error) {
                console.log(error)
            }
        })

        user.socket.on("UPDATE_TURN", (data) => {
            console.log("Updating turn")
            const roomId = appManager.getUserToRoomMapping().get(user.socket.id);
            if(!roomId) return;
            gameManager.fetchMemoryGameAndUpdateTurn(roomId, user.socket.id);
        })
    }
}

export const userManager = UserManager.getInstance()
