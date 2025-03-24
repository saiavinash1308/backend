import { appManager } from "../main/AppManager";


export class SocketManager {
    private static instance: SocketManager;

    static getInstance(){
        if(SocketManager.instance){
            return SocketManager.instance;
        }

        SocketManager.instance = new SocketManager();
        return SocketManager.instance;
    }

    

    public broadcastToRoom(roomId: string, event: string, message: string){
        const sockets = appManager.getPlayerSockets(roomId);
        if(sockets){
            sockets.forEach(socket => {
                socket.emit(event, message)
            });
        }
        
    }

    public emitToOthers(roomId: string, event: string, message: string, playerId: string){
        const sockets = appManager.getPlayerSockets(roomId);
        if(sockets){
            sockets.forEach(socket => {
                if(socket.id !== playerId){
                    socket.emit(event, message)
                }
            });
        } 
    }


}

export const socketManager = SocketManager.getInstance()