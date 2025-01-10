import { Socket } from "socket.io";
import { LudoBoard } from "../board/LudoBoard";
import { appManager } from "../main/AppManager";
import { Room } from "../room/Room";
import { socketManager } from "../socket/SocketManager";

export class Dice{
    private diceValue: number = 5;
    private isRolled: boolean = false;

    private getRandomValue() {
        const values = [4, 5, 6];
        const randomIndex = Math.floor(Math.random() * values.length);
        return values[randomIndex];
      }

    rollDice(){
        // this.diceValue = Math.floor(Math.random() * 6) + 1;
        // this.diceValue = 6;
        this.diceValue = this.getRandomValue();
        this.isRolled = true;
        return this.diceValue
    }

    getDiceValue(){
        return this.diceValue
    }

    isDiceRolled(){
        return this.isRolled
    }

    updateDiceState(){
        this.isRolled = false;
    }

}


export class LudoGame{
    private readonly roomId: string;
    private readonly board: LudoBoard;
    private readonly players: string[] = [];
    private dice: Dice = new Dice();
    private room: Room;
    private currentPlayer: string;
    private turnTimer: NodeJS.Timeout | null = null; // Timer ID for the turn
    private turnTimeLimit = 10000;

    constructor(roomId: string){
        this.roomId = roomId
        const room = appManager.getRooms().get(roomId);
        if(!room) throw new Error('Room not found');
        this.room = room;
        const sockets = this.room.getPlayerSockets();
        sockets.forEach((player) => {
            this.players.push(player.id);
        })
        this.currentPlayer = this.players[0]
        this.board = new LudoBoard(sockets, this.roomId)
        const newUsers = new Array<{socketId: string}>();
        this.players.forEach((player) => newUsers.push({socketId: player}))
        const message = JSON.stringify({roomId, users: newUsers})
        socketManager.broadcastToRoom(roomId, "STOP_SEARCH", 'Stop Searching');
        socketManager.broadcastToRoom(roomId, "START_GAME", message);
        setTimeout(() => {
            socketManager.broadcastToRoom(roomId, "CURRENT_TURN", this.currentPlayer)
            this.startTurnTimer();
        }, 1000);
    }

    getGameType(){
        return this.room.getGameType()
    }

    private isValidTurn(playerId: string){
        
        return playerId === this.currentPlayer
    }

    private getPlayerIndex(playerId: string){
        return this.players.findIndex((player) => player === playerId)
    }

    public rollDice(playerId: string){
        console.log("Roll Dice socket requested: " + this.currentPlayer + " Socket Recieved: " + playerId);
        if(!this.isValidTurn(playerId)) return
        this.resetTurnTimer(); 
        this.board.setIsPieceMoved(false);
        const diceValue = this.dice.rollDice()
        const playerIndex = this.getPlayerIndex(playerId);
        socketManager.broadcastToRoom(this.roomId, 'DICE_ROLLED', JSON.stringify({playerId, diceValue}))
        setTimeout(() => {
            if(diceValue !== 6 && this.board.checkAllPiecesAtStart(playerId)){
                console.log("This is dice value in roll Dice: " + diceValue + " Current turn is called here");
                this.updateTurn();
                return
            }
        }, 1400);
        this.startTurnTimer(); 
        
    }

    private startTurnTimer() {
        if (this.turnTimer) clearTimeout(this.turnTimer); // Clear any existing timer
        this.turnTimer = setTimeout(() => {
            console.log(`Timer expired for player: ${this.currentPlayer}`);
            this.updateTurn(); // Automatically update turn after 10 seconds
        }, this.turnTimeLimit);
    }

    private resetTurnTimer() {
        if (this.turnTimer) clearTimeout(this.turnTimer); // Clear existing timer
    }

    public makeMove(playerId: string, piece: number){
        this.resetTurnTimer();
        if(!this.isValidTurn(playerId)) return;
        if(piece < 0 || piece > 3) return;
        const diceValue = this.dice.getDiceValue();
        const isMoveValid = this.board.makeMove(playerId, piece, diceValue);
        if(isMoveValid){
            this.board.setIsPieceMoved(true);
            if(this.board.checkWin(playerId)){
                this.endGame(playerId);
                return;
            }
            
        }
    }

    //status check

    public moveUpdate(playerId: string){
        if(!this.isValidTurn(playerId)) return;
        const diceValue = this.dice.getDiceValue();
        if(!this.board.getIsPieceMoved()) return
        if(this.board.getIsPieceKilled()){
            socketManager.broadcastToRoom(this.roomId, 'CURRENT_TURN', this.currentPlayer)
            this.board.setIsPieceKilled(false);
            this.startTurnTimer();
            return;
        }
        if(diceValue === 6){
            socketManager.broadcastToRoom(this.roomId, 'CURRENT_TURN', this.currentPlayer);
            this.startTurnTimer();
            return;
        }
        this.updateTurn();
        return;
                
    }

    private updateTurn(){
        this.resetTurnTimer(); 
        const currentPlayerIndex = this.getPlayerIndex(this.currentPlayer);
        this.currentPlayer = this.players[(currentPlayerIndex + 1) % this.players.length];
        socketManager.broadcastToRoom(this.roomId, 'CURRENT_TURN', this.currentPlayer)
        socketManager.broadcastToRoom(this.roomId, "PIECE_POSITIONS", this.board.printAllPositions())
        this.startTurnTimer();
    }

    public forceUpdateTurn(playerId: string){
        console.log(`Force update from ${playerId} expected ${this.currentPlayer}`);
        if(!this.isValidTurn(playerId)) return 
        const currentPlayerIndex = this.getPlayerIndex(this.currentPlayer);
        this.currentPlayer = this.players[(currentPlayerIndex + 1) % this.players.length];
        socketManager.broadcastToRoom(this.roomId, 'CURRENT_TURN', this.currentPlayer)
    }

    public getRoomId(){
        return this.roomId
    }

    private endGame(playerId: string){
        //store details in the db
        socketManager.broadcastToRoom(this.roomId, 'GAME_OVER', JSON.stringify({playerId}))   
    }
}