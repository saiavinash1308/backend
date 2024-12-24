import express from 'express'
import jwt from 'jsonwebtoken'
import {prisma} from '../lib/auth'
import Razorpay from 'razorpay';
import z from 'zod'
import uniqid from 'uniqid'
import sha256 from 'sha256'

import crypto from 'crypto';
import { authenticateToken, UserRequest } from '../middlewares/verifyUser';

const router = express.Router();



const razorpayInstance = new Razorpay({
    key_id: 'rzp_test_ILhEsA5oxLGYj5',
    key_secret: 'eb0oOIIO5da9NVCwSL5RHqMU',
});



const merchantId = process.env.MERCHANT_ID || "M22F6CXLQ1S7I";
const saltKey = process.env.SALT_KEY || "d9b1f019-b8da-493e-846d-74004f5f371a";
const keyIndex = process.env.KEY_INDEX || 1;
const PHONE_PE_HOST_URL = "https://api.phonepe.com/apis/hermes";
const amount = 100

router.get("/pay", async function (req, res, next) {
  // Initiate a payment



  const merchantTransactionId = uniqid()
  // redirect url => phonePe will redirect the user to this url once payment is completed. It will be a GET request, since redirectMode is "REDIRECT"
  let normalPayLoad = {
    merchantId: merchantId, //* PHONEPE_MERCHANT_ID . Unique for each account (private)
    merchantTransactionId: uniqid(),
    merchantUserId: "MUID123",
    amount: amount * 100, // converting to paise
    redirectUrl: `http:localhost:3001/payment/validate/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    mobileNumber: "9014115604",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
  let base64EncodedPayload = bufferObj.toString("base64");

  // X-VERIFY => SHA256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + ### + SALT_INDEX
  let string = base64EncodedPayload + "/pg/v1/pay" + saltKey;
  let sha256_val = sha256(string);
  let xVerifyChecksum = sha256_val + "###" + keyIndex;

  fetch(`${PHONE_PE_HOST_URL}/pg/v1/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerifyChecksum,
      accept: 'application/json',
    },
    body: JSON.stringify({
      request: base64EncodedPayload,
    }),
  })
    .then( async function (response) {
      const data = await response.json();
      console.log("response->", JSON.stringify(data));
      res.json({url: data.data.instrumentResponse.redirectInfo.url});
    })
    .catch(function (error) {
      res.send(error);
    });
});

// endpoint to check the status of payment
router.get("/payment/validate/:merchantTransactionId", async function (req, res) {
  const { merchantTransactionId } = req.params;
  // check the status of the payment using merchantTransactionId
  if (merchantTransactionId) {
    let statusUrl =
      `${PHONE_PE_HOST_URL}/pg/v1/status/${merchantId}/` +
      merchantTransactionId;

    // generate X-VERIFY
    let string =
      `/pg/v1/status/${merchantId}/` + merchantTransactionId + saltKey;
    let sha256_val = sha256(string);
    let xVerifyChecksum = sha256_val + "###" + keyIndex;


      fetch(statusUrl, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          "X-MERCHANT-ID": merchantTransactionId,
          accept: "application/json",
        },
      })
      .then(async (response: { json: () => any; }) => {
        const data = await response.json(); // Parse JSON response
        console.log('response->', data);
        if (data && data.code === 'PAYMENT_SUCCESS') {
          // Redirect to FE payment success status page
          res.send(data);
        } else {
          // Redirect to FE payment failure / pending status page
          res.send("Payment failed or pending status");
        }
        res.send(data);
      })
      .catch((error: any) => {
        // Handle errors here
        console.error('Error:', error);
        res.send(error);
      });
  } else {
    res.send('Sorry!! Error');
  }
  
});




router.post('/create',  async(req, res) => {
  try {
      const token = req.headers['authorization'];
      if (!token) {
          return res.status(401).send('Unauthorized token'); // Unauthorized
      }

      const data = jwt.verify(token, process.env.JWT_SECRET || "secret");
      const { userId }: any = data;

      const user = await prisma.user.findUnique({
          where: {
              userId
          }
      });

      if (!user) {
          return res.status(400).json({ message: 'User not found' });
      }

      const { amount } = req.body;
      if (!amount || isNaN(amount) || amount <= 0) {
          return res.status(400).json({ message: 'Invalid amount' });
      }

      console.log(amount)

      const validateAmount = z.number().positive().safeParse(amount);
      if (!validateAmount.success) {
          return res.status(400).json({ message: 'Invalid amount type' });
      }

      // Razorpay order options
      const options = {
          amount: Math.round(amount * 100), // Convert to paise and ensure it's an integer
          currency: 'INR',
          receipt: `receipt_order_${new Date().getTime()}`, // Dynamic receipt
          payment_capture: 1, // Auto-capture
      };

      const order = await razorpayInstance.orders.create(options);

    
      const transaction = await prisma.payments.create({
          data: {
              orderId: order.id,
              userId,
              amount: Number(order.amount),
              currency: order.currency
          },
      });

      return res.status(200).json({ message: 'Payment created', orderId: order.id, amount: order.amount });
  } catch (error) {
      console.error("Razorpay Error:", error);
      return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/fetchTransactions', authenticateToken, async(req: UserRequest, res) => {
  try {
    const authUser = req.user
    if(!authUser){
        return res.status(401).json({message: 'Unauthorized'})
    }
    const {userId} = authUser
    const transactions = await prisma.payments.findMany({
      where: {
        userId
      },
      select: {
        orderId: true,
        createdAt: true,
        amount: true,
        status: true,
      },
      take: 20
    })
    return res.status(200).json(transactions)
    } catch (error) {
      return res.status(500).json({message: 'Internal server error'})
    }
  
})



router.post('/update', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, status } = req.body;
    razorpay_order_id
  
    // If status is failed, no need to verify signature, directly update status
    if (status === 'failed') {
      try {
        const updatedTransaction = await prisma.payments.update({
          where: { orderId: razorpay_order_id },
          data: {
            status: "Failed", // Mark transaction as failed
          },
        });
        return res.status(200).json({ message: 'Transaction marked as failed', transaction: updatedTransaction });
      } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({ message: 'Error updating transaction', error });
      }
    }
  
    // Otherwise, verify the successful payment
    const secret = process.env.RAZORPAY_SECRET || 'your_key_secret';
    const generatedSignature = crypto.createHmac('sha256', secret).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature. Payment verification failed' });
    }
  
    try {
      // Update transaction for successful payment
      const updatedTransaction = await prisma.payments.update({
        where: { orderId: razorpay_order_id },
        data: {
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          status: "Paid",
        },
      });
  
      res.status(200).json({ message: 'Transaction updated successfully', transaction: updatedTransaction });
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: 'Error updating transaction', error });
    }
  });



  

export default router;