import { GameType } from "../../types/GameTypes";
import { appManager } from "../main/AppManager";
import { CricketGame } from "./CricketGame";
import { FastLudoGame } from "./FastLudoGame";
import { LudoGame } from "./LudoGame";
import { MemoryGame } from "./MemoryGame";

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

    fetchMemoryGameAndPickCard(roomId: string, playerId: string, index: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "MEMORYGAME")  return;
        const memorygame = game as MemoryGame
        memorygame.pickCard(playerId, index);
    }

    fetchMemoryGameAndUpdateTurn(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "MEMORYGAME")  return;
        const memorygame = game as MemoryGame
        memorygame.handleTurn(playerId);
    }

    fetchMemoryGameAndExitRoom(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "MEMORYGAME")  return;
        const memorygame = game as MemoryGame
        memorygame.exitGame(playerId)
    }

    //LUDO Functions

    fetchLudoGameAndRollDice(roomId: string, playerId: string, diceValue: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.rollDice(playerId, diceValue);
    }

    fetchLudoGameAndFinishMoving(roomId: string, playerId: string, diceValue: number, reached: boolean){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.finishMoving(playerId, diceValue, reached);
    }

    fetchLudoGameAndSwitchPlayer(roomId: string, playerId: string, diceValue: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.switchPlayer(playerId, diceValue);
    }

    fetchLudoGameAndAvoidSwitchPlayer(roomId: string, playerId: string, diceValue: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.avoidSwitchPlayer(playerId, diceValue);
    }

    fetchLudoGameAndMovePlayer(roomId: string, playerId: string, pawn: number, diceValue: number){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.movePlayer(playerId, pawn, diceValue)
    }

    fetchLudoGameAndPlayerWin(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.playerWin(playerId);
    }
    fetchLudoGameAndExitRoom(roomId: string, playerId: string){
        const game = this.games.get(roomId);
        if(!game) return;
        const room = appManager.getRoom(roomId);
        if(!room || room.getGameType() !== "LUDO")  return;
        const ludoGame = game as LudoGame
        ludoGame.exitRoom(playerId);
    }

}

export const gameManager = GameManager.getInstance()