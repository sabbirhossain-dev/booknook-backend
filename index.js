import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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
// Convert totalCopies string to number

const borrowCollection = db.collection("borrow");

// Root route
app.get("/", async (req, res) => {
  res.send({ message: "Server is running" });
});

//added books
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

//get all books
app.get("/books", async (req, res) => {
  try {
    const books = await booksCollection.find({}).toArray();
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//get single book
app.get("/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//borrow book

app.post("/borrow", async (req, res) => {
  try {
    const { bookId, userName, userEmail } = req.body;

    // Validate input
    if (!bookId || !userName || !userEmail) {
      return res.status(400).json({
        message: "Missing required information!",
      });
    }

    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({
        message: "Invalid book ID!",
      });
    }

    // Check if user already borrowed a book
    const existingUserBorrow = await borrowCollection.findOne({
      userEmail,
      bookId,
      status: "borrowed",
    });

    if (existingUserBorrow) {
      return res.status(400).json({
        message: "You have already borrowed this book!",
      });
    }

    // Find book
    const book = await booksCollection.findOne({
      _id: new ObjectId(bookId),
    });
    console.log("Book data:", book);
    console.log("Total copies:", book?.totalCopies);
    console.log("Type:", typeof book?.totalCopies);

    if (!book) {
      return res.status(404).json({
        message: "Book not found!",
      });
    }

    // Check available copies
    if (Number(book.totalCopies) <= 0) {
      return res.status(400).json({
        message: "This book is not available!",
      });
    }

    // Reduce total copies
    const updateBook = await booksCollection.updateOne(
      {
        _id: new ObjectId(bookId),
        totalCopies: { $gt: 0 },
      },
      {
        $inc: { totalCopies: -1 },
      },
    );

    if (updateBook.modifiedCount === 0) {
      return res.status(400).json({
        message: "No copies available!",
      });
    }

    // Save borrow information
    const borrowData = {
      bookId: book._id.toString(),
      bookTitle: book.title,
      author: book.author,
      image: book.image,
      category: book.category,
      userName,
      userEmail,
      status: "borrowed",
      borrowedAt: new Date(),
    };

    const result = await borrowCollection.insertOne(borrowData);

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully!",
      result,
    });
  } catch (error) {
    console.error("Borrow error:", error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

// Start the server
app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
