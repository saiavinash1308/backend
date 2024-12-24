export class CricketGame {
    private readonly roomId: string
    constructor(roomId: string){
        this.roomId = roomId
    }

    public getRoomId(){
        return this.roomId
    }
}