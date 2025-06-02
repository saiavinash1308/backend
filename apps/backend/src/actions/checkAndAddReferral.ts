import { prisma } from "../lib/auth"

export const checkAndAddReferral = async(referralId: string) => {
    const referral = await prisma.referral.findUnique({
        where: {
            referralId
        },
        select: {
            refereeId: true,
            bonus: true
        }
    })

    if(!referral) return

    const wallet = await prisma.wallet.findUnique({
        where: {
            userId: referral.refereeId
        },
        select: {
            walletId: true
        }
    })

    if(!wallet) return 
    await prisma.wallet.update({
        where: {
            walletId: wallet.walletId
        },
        data: {
            currentBalance: {
                increment: referral.bonus
            }
        }
    })

    return
}