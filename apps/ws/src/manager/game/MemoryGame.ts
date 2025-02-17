import { appManager } from "../main/AppManager";
import { Room } from "../room/Room";
import { socketManager } from "../socket/SocketManager";

export class MemoryGame{
    private readonly roomId: string
        private readonly room: Room
        private player1: string;
        private player2: string;
        private currentPlayer: string;
        private card1: string | null = null;
        private card1Index: number = -1;
        private player1Score: number =  0;
        private player2Score: number =  0;
        private gameCards: string[];
        private isGameEnd: boolean = false;
        constructor(roomId: string){
            this.roomId = roomId
            const room = appManager.getRooms().get(roomId);
            if(!room) throw new Error('Room not found');
            this.room = room;
            this.gameCards = this.shuffleCards();
            const sockets = this.room.getPlayerSockets();
            this.player1 = sockets[0].id;
            this.player2 = sockets[1].id;
            this.currentPlayer = this.player1;
            const newUsers = new Array<{socketId: string, username: string}>();
            this.room.getPlayers().forEach((player) => newUsers.push({socketId: player.getSocket().id, username: player.username}))
            const message = JSON.stringify({roomId, users: newUsers})
            socketManager.broadcastToRoom(roomId, "STOP_SEARCH", 'Stop Searching');
            socketManager.broadcastToRoom(roomId, "START_MEMORY_GAME", message);
            setTimeout(() => {
                socketManager.broadcastToRoom(roomId, "MEMORY_GAME_CURRENT_TURN", this.currentPlayer)
            }, 1000);
        }

        private shuffleCards(){
            const iconConfigs = [
                "Candy_1",
                "Candy_2",
                "Candy_3",
                "Candy_4",
                "Candy_5",
                "Candy_6",
                "Candy_7",
                "Candy_8",
                "Candy_9",
                "Candy_10",
                "Candy_11",

            ]
            const duplicatedArray = [...iconConfigs, ...iconConfigs];
            const shuffledArray = duplicatedArray.sort(() => Math.random() - 0.5);
            return shuffledArray;
        }

        private handleTurn(){
            this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
            return this.currentPlayer;
        }

        private isValidTurn(playerId: string){
            return this.currentPlayer === playerId;
        }

        public getRoomId(){
            return this.roomId;
        }

        public pickCard(playerId: string, index: number){
            if(!this.isValidTurn(playerId)) return;
            if(index < 0 || index > 21) return;
            console.log(this.gameCards.length);
            const currentCard = this.gameCards[index];
            //TODO: emit to open the card
            setTimeout(() => {
            console.log("Running game picker...");
            const message = JSON.stringify({card: currentCard, index})
            socketManager.broadcastToRoom(this.roomId, "OPEN_CARD", message);
        }, 1000);
            if(!this.card1) {
                this.card1 = currentCard
                this.card1Index = index
                return
            }
            if(this.card1Index === index) return;
            if((this.card1 === currentCard)){
                    this.currentPlayer === this.player1 ? this.player1Score++  : this.player2Score++
                    //TODO: update score with same current turn and remove cards
                    setTimeout(() => {
                        if(this.player1Score + this.player1Score < 11){
                            const message = JSON.stringify({playerId: this.currentPlayer, index1: this.card1Index, index2: index})
                            socketManager.broadcastToRoom(this.roomId, "CARDS_MATCHED", message);
                            this.card1Index = -1
                            this.card1 = null
                        }
                        else{
                            const winnerId = this.player1Score > this.player2Score ? this.player1 : this.player2;
                            socketManager.broadcastToRoom(this.roomId, "END_GAME", winnerId);
                        }
                    }, 1000);
            }
            else{
                //close cards and update the turn;
                setTimeout(() => {
                    const currentTurn = this.handleTurn();
                    const message = JSON.stringify({index1: this.card1Index, index2: index})
                    socketManager.broadcastToRoom(this.roomId, "CLOSE_CARDS", message)
                    this.card1Index = -1
                    this.card1 = null
                    setTimeout(() => {
                        socketManager.broadcastToRoom(this.roomId, "MEMORY_GAME_CURRENT_TURN", currentTurn)
                    }, 1000);
                }, 1000);
            }
        }




}