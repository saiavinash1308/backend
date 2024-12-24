import { DBGameType } from "../../types/RoomTypes";
import { User } from "../users/User";

type AddPlayerResponse = boolean

export class Room {
    private readonly roomId: string;
    private readonly players: User[];
    private isPending: boolean;
    private readonly maxPlayers: number;
    private readonly gameType: DBGameType;
    private readonly entryFee: number;
    
    constructor(roomId: string, maxPlayers: number, player: User, gameType: DBGameType, entryFee: number) {
      this.roomId = roomId;
      this.players = [];
      this.addPlayer(player);
      this.isPending = true;
      this.maxPlayers = maxPlayers;
      this.gameType = gameType
      this.entryFee = entryFee
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

    getPlayerSockets(){
      return this.players.map(player => player.getSocket())
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