import { GetPlayerSocketResponse } from "../../types/AppTypes"
import { Room } from "../room/Room"

export class AppManager{
    private static instance: AppManager
    private readonly rooms: Map<string, Room>
    private readonly userToRoomMapping: Map<string, string>
    private pendingRoomMappings: Map<string, string | null>

    constructor(){
        this.rooms = new Map()
        this.userToRoomMapping = new Map()
        this.pendingRoomMappings = new Map()
    }
    static getInstance(): AppManager{
        if(AppManager.instance){
            return AppManager.instance;
        }
        AppManager.instance = new AppManager();
        return AppManager.instance;
    }

    public getUserToRoomMapping(){
        return this.userToRoomMapping
    }

    public getRooms(){
        return this.rooms;
    }

    public getRoom(roomId: string){
        return this.rooms.get(roomId)
    }

    public getPendingRoomMappinngs(){
        return this.pendingRoomMappings
    }

    public getPlayerSockets(roomId: string): GetPlayerSocketResponse{
        const room = this.rooms.get(roomId);
        if(room){
            return room.getPlayerSockets()
        }
        return null
    }
}

export const appManager = AppManager.getInstance()

