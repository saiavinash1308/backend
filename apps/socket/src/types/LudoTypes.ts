export interface LudoPosition {
    isSafePosition: boolean,
    positionPieces: string[]
}

export interface LudoPiece {
    pieceId: string
    position: "home" | "won" | "running",
    color: "red" | "blue" | "green" | "yellow",
}