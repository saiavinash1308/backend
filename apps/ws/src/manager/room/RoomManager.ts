import { User } from "../users/User";
import { Room } from "./Room";
import { AddToPendingRoomResponse, GameDetailsResponse } from "../../interfaces/RoomManagerResponse";
import { prisma } from "../../interfaces/RoomResponse";
import { UserExistsInRoomResponse } from "../../types/RoomManagerTypes";
import { createId } from '@paralleldrive/cuid2'
import { socketManager } from "../socket/SocketManager";
import { appManager } from "../main/AppManager";
import { gameManager } from "../game/GameManager";
import { LudoGame } from "../game/LudoGame";
import { FastLudoGame } from "../game/FastLudoGame";
import { CricketGame } from "../game/CricketGame";
import { RummyGame } from "../game/RummyGame";
import { GameType } from "../../types/GameTypes";
import { DBGameType } from "../../types/RoomTypes";


export class RoomManager {
    private static instance : RoomManager
    static getInstance(): RoomManager{
        if(RoomManager.instance){
            return RoomManager.instance;
        }
        RoomManager.instance = new RoomManager();
        return RoomManager.instance;
    }

    private checkUserExistsInRoom(socketId: string): UserExistsInRoomResponse{
        const checkUser = appManager.getUserToRoomMapping().get(socketId);
        if(checkUser) return true;
        return false
    }

    private async fetchGameDetails(gameId: string): Promise<GameDetailsResponse>{
        //fetch game details
        //need to add redis
        const gameDetails = await prisma.game.findUnique({
            where: {
                gameId,
                isActive: true
            }
        });
        if(!gameDetails) return {success: false}
        return {success: true, gameDetails}
    }

    private async createNewRoom(user: User, gameId: string){
        const data = await this.fetchGameDetails(gameId);
        if(data.success){
            const gameDetails = data.gameDetails;
            if(gameDetails){
                const roomId = createId()
                const room = new Room(roomId, gameDetails.maxPlayers, user, gameDetails.gameType, gameDetails.entryFee);
                appManager.getRooms().set(roomId, room);
                appManager.getPendingRoomMappinngs().set(gameId, roomId)
                appManager.getUserToRoomMapping().set(user.getSocket().id, roomId);
                const message = JSON.stringify({ message: 'Room created', roomId })
                user.getSocket().emit('ROOM_CREATED', message)
            }
            else{
                const message = JSON.stringify({ message: 'Game not found' })
                user.getSocket().emit('GAME_NOT_FOUND', message)
            }
        }
    }


    private insertIntoPendingRoom(user: User, roomId: string): AddToPendingRoomResponse{
        const pendingRoom = appManager.getRooms().get(roomId);
        if(pendingRoom && pendingRoom.isPendingRoom()){
            pendingRoom.addPlayer(user);
            appManager.getUserToRoomMapping().set(user.getSocket().id, roomId);
            return {success: true, message: 'User added to room'} 
        }
        if(!pendingRoom){
            return {success: false, message: 'Room not found'} 
        }
        return {success: false, message: 'Room is full'}
    }

    private getGameObject(roomId: string, gameType:DBGameType ): GameType{
        switch(gameType){
            case "LUDO":
                return new LudoGame(roomId)
            case "FAST_LUDO":
                return new FastLudoGame(roomId)
            case "CRICKET":
                return new CricketGame(roomId)
            case "RUMMY":
                return new RummyGame(roomId)
        }
    }


    async createOrInsertIntoRoom(user: User, gameId: string){
        const socket = user.getSocket()
        if(this.checkUserExistsInRoom(socket.id)){
            const message = JSON.stringify({ message: 'User already in room' })
            socket.emit('USER_ALREADY_IN_ROOM', message)
            return
        }
        const pendingRoomId = appManager.getPendingRoomMappinngs().get(gameId)
        if(pendingRoomId){
            const data = this.insertIntoPendingRoom(user, pendingRoomId)
            if(data.success){
                const message = JSON.stringify({ message: 'User added to room', roomId: pendingRoomId })
                socketManager.broadcastToRoom(pendingRoomId, 'USER_JOINED', message);
                const room = appManager.getRooms().get(pendingRoomId);
                if(room && !room.isPendingRoom()){
                    //create game instance
                    appManager.getPendingRoomMappinngs().set(gameId, null)
                    const game = this.getGameObject(pendingRoomId, room.getGameType())
                    gameManager.createNewGame(game)
                }
                
            }else{
                const message = JSON.stringify({ message: data.message })
                socket.emit('USER_JOIN_FAILED', message)
            }
            return
        }
        await this.createNewRoom(user, gameId)
    }
}


export const roomManager = RoomManager.getInstance()