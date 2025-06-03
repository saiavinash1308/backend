import { DBGameType } from "../../types/RoomTypes";
import { appManager } from "../main/AppManager";
import { socketManager } from "../socket/SocketManager";
import { User } from "../users/User";
import { roomManager } from "./RoomManager";

type AddPlayerResponse = boolean

export class Room {
    private readonly gameId: string
    private readonly roomId: string;
    private players: User[];
    private isPending: boolean;
    private readonly maxPlayers: number;
    private readonly gameType: DBGameType;
    private readonly entryFee: number;
    private readonly _prizePool: number;
    
    constructor(roomId: string, gameId: string, maxPlayers: number, player: User, gameType: DBGameType, entryFee: number, prizePool: number ) {
      this.roomId = roomId;
      this.players = [];
      this.addPlayer(player);
      this.isPending = true;
      this.maxPlayers = maxPlayers;
      this.gameType = gameType
      this.entryFee = entryFee
      this.gameId = gameId;
      this._prizePool = prizePool;
      setTimeout(() => {
        if(this.players.length < maxPlayers){
          roomManager.deleteRoom(roomId, gameId)
        }
      }, 20000);
    }
  
    addPlayer(player: User): AddPlayerResponse {
      if (this.players.length >= this.maxPlayers) {
        return false
      }
      
      this.players.push(player);
      
      // Update pending status if room is full
      if (this.isFull()) {
        this.isPending = false;
      }
      
      return true;
    }

    removePlayer(playerId: string){
      this.players = this.players.filter(player => player.socket.id !== playerId);
      return this.players.length
    }

    get prizePool(){
      return this._prizePool
    }

    getGameId(){
      return this.gameId
    }

    getRoomId() {
      return this.roomId;
    }

    getGameType(){
      return this.gameType
    }

    getEntryFee(){
      return this.entryFee
    }

    getMaxPlayers(){
      return this.maxPlayers
    }

    public getPlayers(){
      return this.players;
    }

    getPlayerSockets(){
      return this.players.map(player => player.socket)
    }
  
    getPlayerCount() {
      return this.players.length;
    }
  
    isFull() {
      return this.players.length === this.maxPlayers;
    }
    
    isPendingRoom() {
      return this.isPending;
    }
  }