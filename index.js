import express from "express"
import cors from "cors"
import connectDB from "./config/db.js"

import webRoutes from "./routes/web.js"
import adminRoutes from "./routes/admin.js"
import studentRoutes from "./routes/student.js"
import teacherRoutes from "./routes/teacher.js"
import testRoutes from "./routes/test.js"
import webhookRoutes from "./routes/webhook.js"

const app = express()

// Fix CORS
app.use(cors())
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.sendStatus(200)
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// DB connect on demand
app.use(async (req, res, next) => {
  await connectDB()
  next()
})

// Routes
app.use("/api/webhook", webhookRoutes)
app.use("/api/web", webRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/teacher", teacherRoutes)
app.use("/api/student", studentRoutes)
app.use("/api/test", testRoutes)

app.get("/", (_, res) => res.send("Bruce LMS server live! 🚀"))

// IMPORTANT: No app.listen
export default app
