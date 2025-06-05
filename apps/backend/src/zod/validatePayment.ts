import z from 'zod'
export const validatePaymentSchema = z.object({
    razorpay_payment_id: z.string(),
    razorpay_order_id: z.string(),
    razorpay_signature: z.string(),
    status: z.enum(['success', 'failed'])
})