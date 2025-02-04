import { DBGameType } from "../../types/RoomTypes";
import { appManager } from "../main/AppManager";
import { socketManager } from "../socket/SocketManager";
import { User } from "../users/User";
import { roomManager } from "./RoomManager";

type AddPlayerResponse = boolean

export class Room {
    private readonly gameId: string
    private readonly roomId: string;
    private readonly players: User[];
    private isPending: boolean;
    private readonly maxPlayers: number;
    private readonly gameType: DBGameType;
    private readonly entryFee: number;
    
    constructor(roomId: string, gameId: string, maxPlayers: number, player: User, gameType: DBGameType, entryFee: number) {
      this.roomId = roomId;
      this.players = [];
      this.addPlayer(player);
      this.isPending = true;
      this.maxPlayers = maxPlayers;
      this.gameType = gameType
      this.entryFee = entryFee
      this.gameId = gameId;
      setTimeout(() => {
        if(this.players.length < maxPlayers){
          this.players.forEach(player => {
            player.getSocket().emit("MATCH_MAKING_FAILED", "Unable to find players. Please try after sometime")
          })
          appManager.getRooms().delete(roomId);
          for (const [user, room] of appManager.getUserToRoomMapping().entries()) {
            if (room === roomId) {
                appManager.getUserToRoomMapping().delete(user);
            }
          }
          if(appManager.getPendingRoomMappinngs().get(gameId) === roomId){
            appManager.getPendingRoomMappinngs().delete(gameId);
          }
        }
      }, 200000);
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

    public getPlayers(){
      return this.players;
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