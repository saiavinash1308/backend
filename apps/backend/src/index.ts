import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import adminRouter from './routes/adminRoute'
import userRouter from './routes/userRoute'
import transactionRouter from './routes/transactionRoute'
import bannerRouter from './routes/bannerRoute'
import gameRouter from './routes/gameRoute'
import ticketRouter from './routes/ticketRoute'
import walletRoute from './routes/walletRoute';

dotenv.config()



const app = express()
app.use(cors())
app.use('/uploads', express.static('uploads'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


app.use('/api/admin', adminRouter)
app.use('/api/user', userRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/banner', bannerRouter)
app.use('/api/game', gameRouter)
app.use('/api/ticket', ticketRouter);
app.use('/api/wallet', walletRoute);

app.get("/",(req,res)=>{
    res.send("Hello user");
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

