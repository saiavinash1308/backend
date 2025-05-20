import { appManager } from "../main/AppManager";
import { socketManager } from "../socket/SocketManager";

class DiceManager {
    private _diceValue = 1
    private _diceRolled = false

    public set diceValue(value: number){
        this._diceValue = value;
        this._diceRolled = true
    }

    public get diceValue(){
        return this._diceValue
    }

    public set diceRolled(value: boolean){
        this._diceRolled = value
    }

    public get diceRolled(){
        return this._diceRolled
    }

}

export class LudoGame{
    private roomId: string
    private diceManager = new DiceManager();
    
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
        socketManager.broadcastToRoom(roomId, gamePlayApi.START_GAME, message);
    }

    getRoomId(){
        return this.roomId
    }

    private isValidTurn(playerId: string){
        return this.currentPlayer === playerId
    }

    public rollDice(playerId: string, diceValue: number){
        if(!this.isValidTurn(playerId)) return;
        if(this.diceManager.diceRolled) return;
        this.diceManager.diceValue = diceValue
        socketManager.emitToOthers(this.roomId, gamePlayApi.ROLL_DICE, JSON.stringify({diceValue}), playerId);
    }

    private getNextTurn(){
        const room = appManager.getRooms().get(this.roomId);
        if(!room) return null
        const players = room.getPlayers();
        const index = players.findIndex((player) => player.socket.id === this.currentPlayer);
        this.currentPlayer = players[(index + 1) % players.length].socket.id
        return this.currentPlayer
    }

    public finishMoving(playerId: string, reached: boolean | undefined){
        if(!this.isValidTurn(playerId)) return;
        const diceValue = this.diceManager.diceValue
        if ( diceValue === 6 || reached) {
            socketManager.broadcastToRoom(this.roomId, gamePlayApi.PLAYER_FINISHED_MOVING, JSON.stringify({nextPlayerId: this.currentPlayer,
                   diceValue}))
            return
        }
        const nextPlayerId = this.getNextTurn()
        socketManager.broadcastToRoom(this.roomId, gamePlayApi.PLAYER_FINISHED_MOVING, JSON.stringify({nextPlayerId,diceValue}))
    }

    public switchPlayer(playerId: string){
        if(!this.isValidTurn(playerId)) return;
        const nextPlayerId = this.getNextTurn()
        socketManager.broadcastToRoom(this.roomId, gamePlayApi.SWITCH_PLAYER, JSON.stringify({nextPlayerId}))
    }

    public avoidSwitchPlayer(playerId: string){
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, gamePlayApi.AVOID_SWITCH_PLAYER, JSON.stringify({diceValue: this.diceManager.diceValue}), playerId)
    }

    public movePlayer(playerId: string, pawn: number){
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, gamePlayApi.MOVE_PLAYER, JSON.stringify(({playerId, pawnNo: pawn, diceValue: this.diceManager.diceValue})), playerId)
    }

    public playerWin(playerId: string){
        if(!this.isValidTurn(playerId)) return;
        socketManager.emitToOthers(this.roomId, gamePlayApi.ON_PLAYER_WIN, JSON.stringify({ playerId }), playerId);
    }







}