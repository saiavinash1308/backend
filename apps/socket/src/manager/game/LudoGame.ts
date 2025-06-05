import { AVOID_SWITCH_PLAYER, EXIT_ROOM, MOVE_PLAYER, ON_PLAYER_WIN, PLAYER_FINISHED_MOVING, PLAYER_MOVED, ROLL_DICE, START_GAME, SWITCH_PLAYER, YOU_WIN } from "../../messages/ludomessage";
import { appManager } from "../main/AppManager";
import { socketManager } from "../socket/SocketManager";
import { gameManager } from "./GameManager";


export class LudoGame{
    private roomId: string

    
    
    private currentPlayer: string
    constructor(roomId: string){
        this.roomId = roomId
        const room = appManager.getRooms().get(roomId);
        if(!room) throw new Error('Room not found');
        const players = room.getPlayers();
        const entryFee = room.getEntryFee();
        this.currentPlayer = players[0].socket.id
        const newUsers = new Array<{socketId: string, username: string}>();
        players.forEach((player) => newUsers.push({socketId: player.socket.id, username: player.username}))
        const message = JSON.stringify({roomId, users: newUsers, entryFee});
        socketManager.broadcastToRoom(roomId, START_GAME, message);
    }

    getRoomId(){
        return this.roomId
    }

    private isValidTurn(playerId: string){
        return this.currentPlayer === playerId
    }

    public rollDice(playerId: string, diceValue: number){
        console.log(this.currentPlayer, playerId)
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, ROLL_DICE, JSON.stringify({diceValue}), playerId);
    }

    private getNextTurn(){
        const room = appManager.getRooms().get(this.roomId);
        if(!room) return null
        const players = room.getPlayers();
        const index = players.findIndex((player) => player.socket.id === this.currentPlayer);
        this.currentPlayer = players[(index + 1) % players.length].socket.id
        return this.currentPlayer
    }

    public finishMoving(playerId: string, diceValue: number, reached: boolean){
        if(!this.isValidTurn(playerId)) return;
        if ( diceValue === 6 || reached) {
            socketManager.broadcastToRoom(this.roomId, PLAYER_FINISHED_MOVING, JSON.stringify({nextPlayerId: this.currentPlayer,
                   diceValue}))
            return
        }
        const nextPlayerId = this.getNextTurn()
        socketManager.broadcastToRoom(this.roomId, PLAYER_FINISHED_MOVING, JSON.stringify({nextPlayerId, diceValue}))
    }

    public switchPlayer(playerId: string, diceValue: number){
        console.log("Inner switch player: " + playerId + " " +  this.currentPlayer)
        if(!this.isValidTurn(playerId)) return;
        const nextPlayerId = this.getNextTurn()
        console.log("Next PlayerId: " + nextPlayerId)
        socketManager.broadcastToRoom(this.roomId, SWITCH_PLAYER, JSON.stringify({nextPlayerId, diceValue}))
    }

    public avoidSwitchPlayer(playerId: string, diceValue: number){
        console.log("Inner avoiding switch" + playerId + " " +  this.currentPlayer)
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, AVOID_SWITCH_PLAYER, JSON.stringify({diceValue}), playerId)
    }

    public movePlayer(playerId: string, pawn: number, diceValue: number){
        console.log("Inner move Player: " + playerId + " " + this.currentPlayer)
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, PLAYER_MOVED, JSON.stringify({playerId, pawnNo: pawn, diceValue}), playerId)
    }

    public playerWin(playerId: string){
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, ON_PLAYER_WIN, JSON.stringify({ playerId }), playerId);
        gameManager.deleteGame(this.roomId)
    }

    public exitRoom(playerId: string){
        const room = appManager.getRooms().get(this.roomId);
        if(!room) return;
        const playerCount = room.removePlayer(playerId)
        if(playerCount === 1){
            socketManager.emitToOthers(this.roomId, YOU_WIN, JSON.stringify({ playerId }), playerId);
        }
        else{
            socketManager.emitToOthers(this.roomId, EXIT_ROOM, JSON.stringify({ playerId }), playerId);
        }

        gameManager.deleteGame(this.roomId)
    }







}