import { Socket } from "socket.io";
export class User{
    private readonly userId: string;
    private readonly socket: Socket;
    private readonly _username: string;
    constructor(userId: string, socket: Socket, username: string) {
        this.userId = userId;
        this.socket = socket;
        this._username = username;
    }

    public getSocket(){
        return this.socket
    }
    public getUserId(){
        return this.userId
    }

    public get username(){
        return this._username;
    }
}