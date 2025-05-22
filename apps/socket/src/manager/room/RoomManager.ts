import { User } from "../users/User";
import { Room } from "./Room";
import { AddToPendingRoomResponse, GameDetailsResponse } from "../../interfaces/RoomManagerResponse";
import { prisma } from "../../lib/client";
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
import { MemoryGame } from "../game/MemoryGame";


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
                const wallet = await prisma.wallet.findUnique({
                    where: {
                        userId: user.userId
                    }
                })
                if(!wallet){
                    user.socket.emit("WALLET_NOT_FOUND")
                    return;
                }
                if(wallet.currentBalance < gameDetails.entryFee){
                    user.socket.emit("INSUFFICIENT_FUNDS");
                    return;
                }
                await prisma.wallet.update({
                    where: {
                        walletId: wallet.walletId
                    },
                    data: {
                        currentBalance: {
                            decrement: gameDetails.entryFee
                        }
                    }
                })
                const roomId = createId()
                const room = new Room(roomId, gameId, gameDetails.maxPlayers, user, gameDetails.gameType, gameDetails.entryFee, gameDetails.prizePool);
                appManager.getRooms().set(roomId, room);
                appManager.getPendingRoomMappinngs().set(gameId, roomId)
                appManager.getUserToRoomMapping().set(user.socket.id, roomId);
                console.log("Room created")
                const message = JSON.stringify({ message: 'Room created', roomId })
                user.socket.emit('ROOM_CREATED', message)
            }
            else{
                const message = JSON.stringify({ message: 'Game not found' })
                user.socket.emit('GAME_NOT_FOUND', message)
            }
        }
    }


    private async insertIntoPendingRoom(user: User, roomId: string): Promise<AddToPendingRoomResponse>{
        const pendingRoom = appManager.getRooms().get(roomId);
        if(pendingRoom && pendingRoom.isPendingRoom()){
            const wallet = await prisma.wallet.findUnique({
                where: {
                    userId: user.userId
                }
            })
            if(!wallet){
                return {success: false, message: "Wallet not found"};
            }
            if(wallet.currentBalance < pendingRoom.getEntryFee()){
                return {success: false, message: "Insufficient Funds"};
            }
            await prisma.wallet.update({
                where: {
                    walletId: wallet.walletId
                },
                data: {
                    currentBalance: {
                        decrement: pendingRoom.getEntryFee()
                    }
                }
            })
            pendingRoom.addPlayer(user);
            appManager.getUserToRoomMapping().set(user.socket.id, roomId);
            console.log("User added to room");
            return {success: true, message: 'User added to room'} 
        }
        if(!pendingRoom){
            return {success: false, message: 'Room not found'} 
        }
        return {success: false, message: 'Room is full'}
    }


    public quitRoom(roomId: string, socketId: string){
        const room = appManager.getRooms().get(roomId);
        if(!room) return;
        if(room.getPlayers().length === 1 && room.getPlayers()[0].socket.id === socketId){
            appManager.getUserToRoomMapping().delete(socketId);
            appManager.getRooms().delete(roomId);
            const gameId = room.getGameId();
            if(roomId === appManager.getPendingRoomMappinngs().get(gameId)){
                appManager.getPendingRoomMappinngs().delete(gameId);
            }
        }

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
            case "MEMORYGAME":
                return new MemoryGame(roomId)
        }
    }


    async createOrInsertIntoRoom(user: User, gameId: string){
        const socket = user.socket
        if(this.checkUserExistsInRoom(socket.id)){
            const message = JSON.stringify({ message: 'User already in room' })
            socket.emit('USER_ALREADY_IN_ROOM', message)
            return
        }
        const pendingRoomId = appManager.getPendingRoomMappinngs().get(gameId)
        if(pendingRoomId){
            const data = await this.insertIntoPendingRoom(user, pendingRoomId)
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
                if(data.message === "Insufficient Funds"){
                    user.socket.emit("INSUFFICIENT_FUNDS");
                    return;
                }
                const message = JSON.stringify({ message: data.message })
                socket.emit('USER_JOIN_FAILED', message)
            }
            return
        }
        await this.createNewRoom(user, gameId)
    }
}


export const roomManager = RoomManager.getInstance()