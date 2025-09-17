import 'dotenv/config'
import cors from "cors"
import express from "express"
import connectDB from "./config/db.js"
import fileUpload from 'express-fileupload';
// Routes
import webhookRoutes from "./routes/webhook.js"
import adminRoutes from "./routes/admin.js"
import studentRoutes from "./routes/student.js"
import teacherRoutes from "./routes/teacher.js"
import webRoutes from "./routes/web.js"
import testRoutes from "./routes/test.js"
import mongoose from 'mongoose';

// import artistFive from './utils/artistFive.json' assert { type: "json" };


// Sample data for artist portal

  



// Setting enviroment
connectDB();
const PORT = process.env.PORT || 8000;

const app = express();

// Webhook route
app.use("/api/webhook", webhookRoutes);
// Cors configration
const corsOptions = {
  origin: "*", // ya specific karo: ["http://localhost:5173", "https://yourfrontend.com"]
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
// Preflight ke liye
app.options("*", cors(corsOptions));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ limit: "60mb", extended: true }));
app.use(fileUpload());

// Static files
app.use("/public", express.static("public"));

// API routes.
app.use("/api/web", webRoutes)
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/test", testRoutes);

app.get("/", async (_, res) => res.send('Bruce LMS server live!'));
app.listen(PORT, () => console.log(`listening at ${PORT}`));