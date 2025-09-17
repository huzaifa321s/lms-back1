import 'dotenv/config'
import cors from "cors"
import express from "express"
import connectDB from "./config/db.js"
import fileUpload from "express-fileupload"

// Routes
import webhookRoutes from "./routes/webhook.js"
import adminRoutes from "./routes/admin.js"
import studentRoutes from "./routes/student.js"
import teacherRoutes from "./routes/teacher.js"
import webRoutes from "./routes/web.js"
import testRoutes from "./routes/test.js"

const app = express()

// ✅ Connect DB (async handle)
connectDB()
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB connection error ❌", err))

// Middleware
app.use(cors({ origin: "*" }))
app.use(express.json())
app.use(express.urlencoded({ limit: "60mb", extended: true }))
app.use(fileUpload())

// Static files
app.use("/public", express.static("public"))

// Logging (optional)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
})

// Routes
app.use("/api/webhook", webhookRoutes)
app.use("/api/web", webRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/teacher", teacherRoutes)
app.use("/api/student", studentRoutes)
app.use("/api/test", testRoutes)

// Default route
app.get("/", (_, res) => res.send("Bruce LMS server live! 🚀"))

// ❌ Remove app.listen()
// ✅ Export for Vercel
export default app
