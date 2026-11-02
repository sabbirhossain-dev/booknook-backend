import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";

const app = express();
const port = process.env.port || 5000;

app.use(cors());
app.use(express.json());

//mongodb connection
const client = new MongoClient(`${process.env.MONGODB_URI}`);

const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

const connect = await connectToMongoDB();

const db = connect.db("booknookDB");
const booksCollection = db.collection("books");

// Root route
app.get("/", async (req, res) => {
  res.send({ message: "Server is running" });
});

app.post("/books", async (req, res) => {
  try {
    const data = req.body;
    const books = await booksCollection.insertOne(data);
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/books", async (req, res) => {
  try {
    const books = await booksCollection.find({}).toArray();
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
