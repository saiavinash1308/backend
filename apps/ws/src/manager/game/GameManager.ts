import { GameType } from "../../types/GameTypes";
import { appManager } from "../main/AppManager";
import { FastLudoGame } from "./FastLudoGame";
import { LudoGame } from "./LudoGame";

export class GameManager{
    private static instance: GameManager;
    private readonly games: Map<string, GameType>

    constructor(){
        this.games = new Map()
    }
    static getInstance(){
        if(GameManager.instance){
            return GameManager.instance;
        }

        GameManager.instance = new GameManager();
        return GameManager.instance;
    }

    createNewGame(game: GameType){
        this.games.set(game.getRoomId(), game)
    }

    fetchLudoGameAndRollDice(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludogame = game as LudoGame
        ludogame.rollDice(playerId)
    }

    fetchLudoGameAndMovePiece(roomId: string, playerId: string, piece: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludogame = game as LudoGame
        ludogame.makeMove(playerId, piece);
    }

    fetchLudoGameAndUpdateMove(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludogame = game as LudoGame
        ludogame.moveUpdate(playerId);
    }

    fetchLudoGameAndUpdateTurn(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludogame = game as LudoGame
        ludogame.forceUpdateTurn(playerId);
    }

    fetchFastLudoGameAndEndGame(roomId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "FAST_LUDO")  return;
        const fastludogame = game as FastLudoGame;
        fastludogame.timeUp();
    }
}

export const gameManager = GameManager.getInstance()