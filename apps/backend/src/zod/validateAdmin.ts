import z from 'zod'


// { name, email, password, role } 
export const validateAdmin = z.object({
    name: z.string().min(4).max(20),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string()
})

export const validateUpdateAdmin = z.object({
    name: z.string().min(4).max(20),
    email: z.string().email(),
})

export const validateNotification = z.object({
    title: z.string().min(3),
    body: z.string().min(5),
})

export const validateBanner = z.object({
    title: z.string().min(4, { message: "Title should have at least 4 characters" }),
    url: z.string({message: "Invalid url"})
});

export const validateGameDetails = z.object({
    gameType: z.enum(["LUDO", "CRICKET", "FAST_LUDO", "RUMMY"]),
    maxPlayers: z.union([z.literal(2), z.literal(4)]),
    entryFee: z.number(),
    prizePool: z.number()
});

export const validateTicket = z.object({
    issue: z.string().min(5),
    description: z.string().min(5),
    email: z.string().email(),
    name: z.string().min(5),
    image: z.string().optional()
})

export const validateResolve = z.object({
    input: z.string().email(),
    textarea: z.string().min(5),
    solved: z.enum(['Closed', 'Open']),
    ticketId: z.string().min(5)
})

export const validateUser = z.object({
    name: z.string().min(4),
    mobile: z.string().refine((value) => {
        return /^[6-9][0-9]{9}$/.test(value);
      })
})

export const validateDevice = z.object({
  userId: z.string(),
  deviceId: z.string()
})

export const validateUpdate = z.object({
    username: z.string(),
})