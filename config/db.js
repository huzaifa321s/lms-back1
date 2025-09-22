import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `Database connected successfully! ${conn.connection.host}/${conn.connection.name}`
    );
  } catch(err) {
    console.log("Database connection failed!", err);
    process.exit(1);  
  }
};

export default connectDB;