import rateLimiter from "../../auth/redis";
import { appManager } from "../main/AppManager";
import { Room } from "../room/Room";
import { socketManager } from "../socket/SocketManager";

export class CricketGame {
    private readonly roomId: string
    private readonly room: Room
    private player1: string;
    private player2: string;
    private currentPlayer: string;
    private player1Score: number =  0;
    private player2Score: number =  0;
    private player1Balls: number = 0;
    private player2Balls: number = 0;
    private isGameEnd: boolean = false;
    private isScoreUpdated: boolean = false;
    constructor(roomId: string){
        this.roomId = roomId
        const room = appManager.getRooms().get(roomId);
        if(!room) throw new Error('Room not found');
        this.room = room;
        const sockets = this.room.getPlayerSockets();
        this.player1 = sockets[0].id;
        this.player2 = sockets[1].id;
        this.currentPlayer = this.player1;
        const newUsers = new Array<{socketId: string}>();
        newUsers.push({socketId: this.player1});
        newUsers.push({socketId: this.player2});
        const message = JSON.stringify({roomId, users: newUsers})
        socketManager.broadcastToRoom(roomId, "STOP_SEARCH", 'Stop Searching');
        socketManager.broadcastToRoom(roomId, "START_CRICKET_GAME", message);
    }

    public getRoomId(){
        return this.roomId
    }

    private isBatsman(playerId: string){
        return playerId === this.currentPlayer
    }

    public moveBatsman(playerId: string, data: string){
        if(!this.isBatsman(playerId)) return;
        socketManager.broadcastToRoom(this.roomId, "MOVE_BATSMAN", data)
    }

    public updateTracker(playerId: string, data: string){
        if(this.isBatsman(playerId)) return;
        socketManager.broadcastToRoom(this.roomId, "UPDATE_TRACKER", data);
    }

    public batsManHit(playerId: string){
        socketManager.broadcastToRoom(this.roomId, "BATSMAN_HIT", "");
    }

    public updateScore(playerId: string, score: number){
        if(this.isScoreUpdated) return
        if(!rateLimiter.hasBatsManHitLimit(this.roomId)) {
            console.log(true);
            return
        };
        console.log("Score: " + score)
        if(playerId === this.player1){
            this.player1Score += score; 
            this.player1Balls += 1;
            console.log("Player1 balls" + this.player1Balls);
            if(this.player1Balls === 6){
                this.isScoreUpdated = false;
                this.switchCamera();
            }
        }
        else{
            this.player2Score += score;
            this.player2Balls += 1;
            console.log("Player2 balls" + this.player2Balls);
            if(this.player2Balls === 6){
                console.log("Ending the game...")
                this.isGameEnd = true;
                this.endGame();
            }
        }
        this.isScoreUpdated = true;
        socketManager.broadcastToRoom(this.roomId, "UPDATE_SCORE", score.toString())
    }

    public hitWicket(playerId: string){
        if(!this.isBatsman(playerId)) return;
        socketManager.broadcastToRoom(this.roomId, "WICKET", "")
    }

    private switchCamera(){
        this.currentPlayer = this.player2;
        console.log("Switching the camera");
        socketManager.broadcastToRoom(this.roomId, "SWITCH_CAMERA", "");
    }

    private endGame(){
        this.isGameEnd = true;
        if(this.player1Score > this.player2Score){
            socketManager.broadcastToRoom(this.roomId, "WINNER", this.player1)
        }
        else if(this.player1Score < this.player2Score){
            socketManager.broadcastToRoom(this.roomId, "WINNER", this.player2)
        }
        else{
            console.log("No winner game draw");
            socketManager.broadcastToRoom(this.roomId, "WINNER", "")
        }
    }

    public resetBowler(playerId: string){
        console.log("Calling bowler reset");
        this.isScoreUpdated = false;
        socketManager.broadcastToRoom(this.roomId, "RESET_BOWLER", "");
    }

    public resetBatsMan(playerId: string){
        console.log("Reset batsman");
        socketManager.broadcastToRoom(this.roomId, "RESET_BATSMAN", "");
    }
}