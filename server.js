import app from "./app.js"
import connectDB from "./config/db.js"
import dotenv, { config } from "dotenv"
dotenv.config();
connectDB()
    





app.listen(process.env.PORT,()=>{
    console.log("server running")
})