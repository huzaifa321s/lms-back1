import 'dotenv/config'
import cors from "cors"
import express from "express"
import connectDB from "./config/db.js"
import fileUpload from 'express-fileupload'
import compression from "compression"   //  compression import
import mongoose from 'mongoose'

// Routes
import webhookRoutes from "./routes/webhook.js"
import adminRoutes from "./routes/admin.js"
import studentRoutes from "./routes/student.js"
import teacherRoutes from "./routes/teacher.js"
import webRoutes from "./routes/web.js"
import testRoutes from "./routes/test.js"
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

// Setting enviroment
connectDB()
const PORT = process.env.PORT || 8000

const app = express()

//Compression middleware (apply globally)
app.use(compression())
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
}));
app.use(helmet());
// Webhook route
app.use("/api/webhook", webhookRoutes)

// Cors configuration
app.use(cors({ origin: "*" }))

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
})

// Parsers
app.use(express.json())
app.use(express.urlencoded({ limit: "60mb", extended: true }))
app.use(fileUpload())

// Static files
app.use("/public", express.static("public"))

// API routes
app.use("/api/web", webRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/teacher", teacherRoutes)
app.use("/api/student", studentRoutes)
app.use("/api/test", testRoutes)

// Root route
app.get("/", async (_, res) => res.send('Bruce LMS server live!'))

// Server start
app.listen(PORT, () => console.log(`listening at ${PORT}`))
