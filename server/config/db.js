const mongoose = require("mongoose");

const DEV_DEFAULT_URI = "mongodb://127.0.0.1:27017/alumni_mentorship";

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    if (process.env.NODE_ENV === "production") throw new Error("MONGO_URI is not set. Set it in your hosting environment variables.");
    console.warn(`MONGO_URI is not set - falling back to ${DEV_DEFAULT_URI}`);
    uri = DEV_DEFAULT_URI;
  }
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    throw new Error(`Could not connect to MongoDB at ${uri.replace(/\/\/[^@/]*@/, "//***@")}. Is MongoDB running? (${err.message})`);
  }
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

module.exports = connectDB;
