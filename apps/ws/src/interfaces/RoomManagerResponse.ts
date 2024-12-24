export interface AddToPendingRoomResponse{
    success: boolean
    message: string,
}

export interface GameDetailsResponse {
    success: boolean
    gameDetails?: {
        gameId: string;
        gameType: "LUDO" | "FAST_LUDO" | "CRICKET" | "RUMMY";
        maxPlayers: number;
        entryFee: number;
        prizePool: number;
        currency: string;
        isActive: boolean;
    }

}
