import { GameType } from "../../types/GameTypes";
import { appManager } from "../main/AppManager";
import { CricketGame } from "./CricketGame";
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
        if(!room) return;
        if(room.getGameType() === "LUDO"){
            const ludogame = game as LudoGame
            ludogame.rollDice(playerId)
        }
        else if(room.getGameType() === "FAST_LUDO"){
            const fastludogame = game as FastLudoGame
            fastludogame.rollDice(playerId)
        }
        return
        
    }

    fetchLudoGameAndMovePiece(roomId: string, playerId: string, piece: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room) return;
        if(room.getGameType() === "LUDO"){
            const ludogame = game as LudoGame
            ludogame.makeMove(playerId, piece)
        }
        else if(room.getGameType() === "FAST_LUDO"){
            const fastludogame = game as FastLudoGame
            fastludogame.makeMove(playerId, piece)
        }
        return
    }

    fetchLudoGameAndUpdateMove(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room) return;
        if(room.getGameType() === "LUDO"){
            const ludogame = game as LudoGame
            ludogame.moveUpdate(playerId)
        }
        else if(room.getGameType() === "FAST_LUDO"){
            const fastludogame = game as FastLudoGame
            fastludogame.moveUpdate(playerId)
        }
        return
    }

    fetchLudoGameAndUpdateTurn(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room) return;
        if(room.getGameType() === "LUDO"){
            const ludogame = game as LudoGame
            ludogame.forceUpdateTurn(playerId)
        }
        else if(room.getGameType() === "FAST_LUDO"){
            const fastludogame = game as FastLudoGame
            fastludogame.forceUpdateTurn(playerId)
        }
        return
    }

    fetchFastLudoGameAndEndGame(roomId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "FAST_LUDO")  return;
        const fastludogame = game as FastLudoGame;
        fastludogame.timeUp();
    }

    fetchCricketGameAndBatsmanHit(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "CRICKET")  return;
        const cricketgame = game as CricketGame
        cricketgame.batsManHit(playerId);
    }

    fetchCricketGameAndUpdateScore(roomId: string, playerId: string, score: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "CRICKET")  return;
        const cricketgame = game as CricketGame
        cricketgame.updateScore(playerId, score);
    }

    fetchCricketGameAndHitWicket(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "CRICKET")  return;
        const cricketgame = game as CricketGame
        cricketgame.hitWicket(playerId);
    }

    fetchCricketGameAndResetBowler(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "CRICKET")  return;
        const cricketgame = game as CricketGame
        cricketgame.resetBowler(playerId);
    }

    fetchCricketGameAndResetBatsMan(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "CRICKET")  return;
        const cricketgame = game as CricketGame
        cricketgame.resetBatsMan(playerId);
    }

}

export const gameManager = GameManager.getInstance()