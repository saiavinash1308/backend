import { Socket } from "socket.io";
import { socketManager } from "../socket/SocketManager";

type Piece = {
    pieceId: number;

}

type CheckData = {
    key: string;
    value: number[];
}

export class LudoBoard {
    private roomId: string
    private safePositions: number[] = [0, 8, 13, 21, 26, 34, 39, 47];
    private startPositions: number[] = [39, 0, 13, 26];
    private endPositions: number[] = [405, 105, 205, 305];
    private turnPositions: number[] = [37, 50, 11, 24];
    private sockets: Socket[];
    private userToPiecesMap: Map<string, number[]> = new Map()
    private isPieceKilled: boolean = false;


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
        }
        else if(playerCount === 4){ 
            this.startPositions = [39, 0, 13, 26];
            this.turnPositions = [37, 50, 11, 24];
            this.endPositions = [405, 105, 205, 305];
        }
        for(let i = 0; i < playerCount; i++){
            this.userToPiecesMap.set(sockets[i].id, [-1, -1, -1, -1]);
        }
        
    }

    private checkPieceAtStart(playerId: string, piece: number){
        let pieces = this.userToPiecesMap.get(playerId);
        if(!pieces) return undefined;
        return pieces[piece] === -1
    }

    public checkAllPiecesAtStart(playerId: string){
        let pieces = this.userToPiecesMap.get(playerId);
        if(!pieces) return undefined;
        return pieces.every((piece) => piece === -1)
    }
    private checkAndKill(playerId: string, newPosition: number){
        if(this.safePositions.includes(newPosition)){
            return false
        }
        for(let i = 0; i < this.sockets.length; i++){
            const currentOpponent = this.sockets[i].id
            if(currentOpponent !== playerId){
                const opponentPieces = this.userToPiecesMap.get(currentOpponent);
                if(!opponentPieces) continue;
                for(let j = 0; j < 4; j++){
                    if(opponentPieces[j] === newPosition){
                        opponentPieces[j] = -1;
                        this.userToPiecesMap.set(currentOpponent, opponentPieces)
                        const message = JSON.stringify({playerId: currentOpponent, pieceId: j})
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
        }
        return JSON.stringify(positions);
    }

    makeMove(playerId: string, pieceId: number, diceValue: number){
        console.log("Started moving piece" + pieceId);
        const pieces = this.userToPiecesMap.get(playerId);
        if(!pieces) return false;
        if(diceValue === 6 && this.checkPieceAtStart(playerId, pieceId)){
            const playerIndex = this.sockets.findIndex(s => s.id === playerId)
            const startPosition = this.startPositions[playerIndex]
            pieces[pieceId] = startPosition;
            this.userToPiecesMap.set(playerId, pieces);
            const message = JSON.stringify({playerId, pieceId, piecePositon: startPosition})
            socketManager.broadcastToRoom(this.roomId, 'UPDATE_MOVE', message)
            return true;
        }
        if(this.checkPieceAtStart(playerId, pieceId)) return false
        let piecePositon = pieces[pieceId];
        const playerIndex = this.sockets.findIndex(s => s.id === playerId)
        if(playerIndex === -1) return false;
        if(piecePositon + diceValue > this.endPositions[playerIndex]) return false;
        for(let i = 0; i < diceValue; i++){
            piecePositon++;
            if(piecePositon - 1 === this.turnPositions[playerIndex]){
                piecePositon = this.endPositions[playerIndex]  + ((diceValue - i) - 5);
                return true
            }
            else if(piecePositon === 52){
                piecePositon = diceValue - i;
            }
        }
        pieces[pieceId] = piecePositon;
        this.userToPiecesMap.set(playerId, pieces);
        const message = JSON.stringify({playerId, pieceId, piecePositon})
        socketManager.broadcastToRoom(this.roomId, 'UPDATE_MOVE', message)

        if(this.checkAndKill(playerId, pieceId)) return true;
        return true;
    }

}

