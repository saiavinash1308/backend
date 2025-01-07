import { Socket } from "socket.io";
import { socketManager } from "../socket/SocketManager";

type Piece = {
    pieceId: number;

}

type CheckData = {
    key: string;
    value: number[];
}

export class FastLudoBoard {
    private roomId: string
    private safePositions: number[] = [0, 8, 13, 21, 26, 34, 39, 47];
    private startPositions: number[] = [39, 0, 13, 26];
    private endPositions: number[] = [405, 105, 205, 305];
    private turnPositions: number[] = [37, 50, 11, 24];
    private userScores: number[] = [0, 0, 0, 0];
    private sockets: Socket[];
    private userToPiecesMap: Map<string, number[]> = new Map()
    private isPieceKilled: boolean = false;
    private isPieceMoved = false;


    constructor(sockets: Socket[], roomId: string) {
        this.roomId = roomId;
        this.sockets = sockets;
        this.initializeBoard(sockets);
    }


    private initializeBoard(sockets: Socket[]) {
        const playerCount = this.sockets.length
        if(playerCount === 2){
            this.startPositions = [0, 26];
            this.turnPositions = [50, 24];
            this.endPositions = [105, 305];
            this.userScores = [0, 0];
        }
        else if(playerCount === 4){ 
            this.startPositions = [39, 0, 13, 26];
            this.turnPositions = [37, 50, 11, 24];
            this.endPositions = [405, 105, 205, 305];
            this.userScores = [0, 0, 0, 0];
        }
        for(let i = 0; i < playerCount; i++){
            const startPosition = this.startPositions[i];
            this.userToPiecesMap.set(sockets[i].id, [startPosition, startPosition, startPosition, startPosition]);
        }
        
    }

    public getIsPieceMoved(){
        return this.isPieceMoved
    }

    public setIsPieceMoved(status: boolean){
        this.isPieceMoved = status;
    }

    private getPlayerIndex(playerId: string){
        for(let i = 0; i < this.sockets.length; i++){
            if(playerId == this.sockets[i].id) return i;
        }
        return -1;
    }

    private checkPieceAtStart(playerId: string, piece: number){
        let pieces = this.userToPiecesMap.get(playerId);
        if(!pieces) return undefined;
        const playerIndex = this.getPlayerIndex(playerId);
        if(playerIndex === -1) return undefined;
        return pieces[piece] === this.startPositions[playerIndex];
    }

    private getKillPoints(piecePosition: number, playerIndex: number){
        const startPosition = this.startPositions[playerIndex];
        const val = 52 - startPosition
        if(piecePosition < startPosition){
            return piecePosition + val;
        }
        return val
    }

    private checkAndKill(playerId: string, newPosition: number){
        console.log("Checking for kills");
        if(this.safePositions.includes(newPosition)){
            return false
        }
        for(let i = 0; i < this.sockets.length; i++){
            const currentOpponent = this.sockets[i].id;
            console.log("This is CurrentOpponent: " + currentOpponent);
            if(currentOpponent !== playerId){
                const opponentPieces = this.userToPiecesMap.get(currentOpponent);
                if(!opponentPieces) {
                    console.log(`No pieces found for opponent ${currentOpponent}`);
                    continue;
                };
                for(let j = 0; j < 4; j++){
                    console.log(`This is opponent piece position ${opponentPieces[j]} and given piecePosition ${newPosition} can kill ${opponentPieces[j] === newPosition}`)
                    if(opponentPieces[j] === newPosition){
                        opponentPieces[j] = this.startPositions[i];
                        const killPoints = this.getKillPoints(newPosition, i);
                        this.userScores[i] -= killPoints;
                        const playerIndex = this.getPlayerIndex(playerId);
                        if(playerIndex !== -1) this.userScores[playerIndex] += killPoints;
                        this.userToPiecesMap.set(currentOpponent, opponentPieces)
                        const message = JSON.stringify({playerId: currentOpponent, pieceId: j, points: this.userScores});
                        socketManager.broadcastToRoom(this.roomId, 'KILL_PIECE', message)
                        this.setIsPieceKilled(true);
                        return true
                    }
                }
            }
        }
        return false;
    }

    public setIsPieceKilled(status: boolean){
        this.isPieceKilled = true;
    }

    public getIsPieceKilled(){
        return this.isPieceKilled;
    }


    public checkWin(playerId: string){
        const pieces = this.userToPiecesMap.get(playerId);
        if(!pieces) return false;
        const playerIndex = this.sockets.findIndex(socket => socket.id === playerId);
        if(playerIndex === -1) return false;
        return pieces.every((piece) => piece === this.endPositions[playerIndex])
    }

    public printAllPositions(){
        const positions: CheckData[] = []
        for (const [key, value] of this.userToPiecesMap) {
            const data = {key, value};
            positions.push(data);
        }
        return JSON.stringify(positions);
    }

    makeMove(playerId: string, pieceId: number, diceValue: number){
        const pieces = this.userToPiecesMap.get(playerId);
        if(!pieces) return false;
        let piecePosition = pieces[pieceId];
        const playerIndex = this.getPlayerIndex(playerId);
        if(playerIndex == -1) return false;
        if(piecePosition + diceValue> this.endPositions[playerIndex]) return false;
        let isInside = false;
        for(let i = 0; i < diceValue; i++){
            piecePosition++;
            if(piecePosition - 1 === this.turnPositions[playerIndex]){
                piecePosition = this.endPositions[playerIndex]  + ((diceValue - i) - 5);
                isInside = true;
                break
            }
            else if(piecePosition === 52){
                piecePosition = diceValue - i;
                break
            }
        }
        this.userScores[playerIndex] += diceValue;
        pieces[pieceId] = piecePosition;
        this.userToPiecesMap.set(playerId, pieces);
        const message = JSON.stringify({playerId, pieceId, piecePosition, points: this.userScores});
        socketManager.broadcastToRoom(this.roomId, 'UPDATE_MOVE', message);
        if(!isInside && this.checkAndKill(playerId, piecePosition)) return true;
        return true;
    }

    getWinners(){
        let winners = [this.sockets[0].id]
        let maxPoints = this.userScores[0];
        for(let i = 1; i < this.sockets.length; i++){
            const currentUserPoints = this.userScores[i];
            const socketId = this.sockets[i].id
            if(currentUserPoints > maxPoints){
                winners[0] = socketId;
                maxPoints = currentUserPoints;
            }
            else if(currentUserPoints == maxPoints){
                winners.push(socketId);
            }
            else{
                continue
            }
        }
        return winners;
    }

}

