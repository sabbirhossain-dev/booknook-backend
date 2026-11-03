import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const connect = await connectToMongoDB();

const db = connect.db("booknookDB");
const booksCollection = db.collection("books");
const borrowCollection = db.collection("borrow");

///////////////// middleware////////////////
const verifyToken = async (req, res, next) => {
  try {
    console.log("Middleware called!");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized access",
      });
    }

    const token = authHeader.split(" ")[1];

    // JWT verification
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.FRONTEND_URL}/api/auth/jwks`),
    );

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.FRONTEND_URL,
      audience: process.env.FRONTEND_URL,
    });

    req.user = payload;

    console.log("JWT Verified:", payload.email);

    next();
  } catch (error) {
    console.error("Token Error:", error);

    return res.status(401).send({
      message: "Invalid token",
    });
  }
};

// Root route
app.get("/", (req, res) => {
  res.send({ message: "Server is running" });
});

// ===============================
// ADD BOOK
// ===============================
app.post("/books", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    if (data.userEmail) {
      data.userEmail = data.userEmail.trim().toLowerCase();
    }

    data.totalCopies = Number(data.totalCopies);

    const result = await booksCollection.insertOne(data);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ===============================
// Get Latest 8 Books (New Arrivals)
// ===============================
app.get("/new-arrivals", async (req, res) => {
  try {
    const latestBooks = await booksCollection
      .find()
      .sort({ _id: -1 })
      .limit(8)
      .toArray();

    res.status(200).json(latestBooks);
  } catch (error) {
    console.error("New Arrivals Error:", error);

    res.status(500).json({
      message: "Failed to fetch new arrivals",
    });
  }
});

// ===============================
// GET ALL BOOKS
// ===============================
// app.get("/books", async (req, res) => {
//   try {
//     const books = await booksCollection.find({}).toArray();
//     res.json(books);
//   } catch (error) {
//     console.error("Error fetching books:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

app.get("/books", async (req, res) => {
  try {
    const { category } = req.query;

    const filter = {};

    if (category && typeof category === "string") {
      filter.category = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    const books = await booksCollection
      .find(filter)
      .sort({ _id: -1 })
      .toArray();

    res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching books:", error);

    res.status(500).json({
      message: "Failed to fetch books",
    });
  }
});

// ===============================
// GET SINGLE BOOK
// ===============================
app.get("/books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID!" });
    }

    const book = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).json({ message: "Book not found!" });
    }

    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ===============================
// BORROW BOOK
// ===============================
app.post("/borrows", verifyToken, async (req, res) => {
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

    const normalizedEmail = userEmail.trim().toLowerCase();

    // Check duplicate active borrow
    const existingBorrow = await borrowCollection.findOne({
      userEmail: normalizedEmail,
      bookId: bookId.toString(),
      status: "borrowed",
    });

    if (existingBorrow) {
      return res.status(400).json({
        message: "You have already borrowed this book!",
      });
    }

    // Find book
    const book = await booksCollection.findOne({
      _id: new ObjectId(bookId),
    });

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

    // Reduce stock
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

    // Save borrow data
    const borrowData = {
      bookId: book._id.toString(),
      bookTitle: book.title,
      author: book.author,
      image: book.image,
      category: book.category,
      userName,
      userEmail: normalizedEmail,
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

// ===============================
// GET ALL BORROWS
// ===============================
app.get("/borrows", verifyToken, async (req, res) => {
  try {
    const borrows = await borrowCollection
      .find({})
      .sort({ borrowedAt: -1 })
      .toArray();

    res.status(200).json(borrows);
  } catch (error) {
    console.error("Error fetching borrows:", error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

// ===============================
// GET MY BORROWS
// ===============================
app.get("/my-borrows", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        message: "User email not found!",
      });
    }

    const result = await borrowCollection
      .find({
        userEmail,
        status: "borrowed",
      })
      .sort({ borrowedAt: -1 })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("My Borrows Route Error:", error);

    res.status(500).json({
      message: "Failed to fetch your borrowed books",
    });
  }
});

// ===============================
// RETURN BOOK
// ===============================
app.patch("/borrows/:id/return", verifyToken, async (req, res) => {
  let borrowMarkedReturned = false;
  let borrowId;

  try {
    const { id } = req.params;
    borrowId = id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid borrow ID!",
      });
    }

    const userEmail = req.user.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        message: "User email not found!",
      });
    }

    // Find borrow record
    const borrow = await borrowCollection.findOne({
      _id: new ObjectId(id),
      userEmail,
      status: "borrowed",
    });

    if (!borrow) {
      return res.status(404).json({
        message: "Active borrow record not found!",
      });
    }

    const bookId = borrow.bookId?.toString();

    if (!bookId || !ObjectId.isValid(bookId)) {
      return res.status(400).json({
        message: "Invalid book ID in borrow record!",
      });
    }

    // Update borrow status
    const returnResult = await borrowCollection.updateOne(
      {
        _id: new ObjectId(id),
        userEmail,
        status: "borrowed",
      },
      {
        $set: {
          status: "returned",
          returnedAt: new Date(),
        },
      },
    );

    if (returnResult.modifiedCount === 0) {
      return res.status(400).json({
        message: "Book is already returned!",
      });
    }

    borrowMarkedReturned = true;

    // Increase available copies
    const stockResult = await booksCollection.updateOne(
      {
        _id: new ObjectId(bookId),
      },
      [
        {
          $set: {
            totalCopies: {
              $add: [
                {
                  $convert: {
                    input: "$totalCopies",
                    to: "int",
                    onError: 0,
                    onNull: 0,
                  },
                },
                1,
              ],
            },
          },
        },
      ],
    );

    if (stockResult.matchedCount === 0) {
      throw new Error("Could not update book stock!");
    }

    borrowMarkedReturned = false;

    return res.status(200).json({
      success: true,
      message: "Book returned successfully!",
    });
  } catch (error) {
    console.error("Return Book Error:", error);

    // Rollback borrow status if stock update fails
    if (borrowMarkedReturned && borrowId) {
      await borrowCollection.updateOne(
        {
          _id: new ObjectId(borrowId),
          status: "returned",
        },
        {
          $set: {
            status: "borrowed",
          },
          $unset: {
            returnedAt: "",
          },
        },
      );
    }

    return res.status(500).json({
      success: false,
      message: "Failed to return book!",
    });
  }
});
// ===============================
// GET MY ADDED BOOKS
// ===============================
app.get("/my-book", verifyToken, async (req, res) => {
  try {
    const userEmail = req.query.email;

    if (!userEmail || typeof userEmail !== "string") {
      return res.status(400).json({
        message: "User email is required",
      });
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    const myBooks = await booksCollection
      .find({
        userEmail: normalizedEmail,
      })
      .toArray();

    res.status(200).json(myBooks);
  } catch (error) {
    console.error("Error fetching my books:", error);

    res.status(500).json({
      message: "Failed to fetch your books",
    });
  }
});

// ===============================
// Update my book api
// ===============================
app.put("/books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userEmail,
      title,
      author,
      category,
      description,
      image,
      totalCopies,
    } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID!" });
    }

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required!" });
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    const result = await booksCollection.updateOne(
      {
        _id: new ObjectId(id),
        userEmail: normalizedEmail,
      },
      {
        $set: {
          title,
          author,
          category,
          description,
          image,
          totalCopies: Number(totalCopies),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Book not found or you are not the owner!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Book updated successfully!",
    });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ message: "Failed to update book" });
  }
});

// ===============================
// Delete my book
// ===============================

app.delete("/books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.query.email;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID!" });
    }

    if (!userEmail || typeof userEmail !== "string") {
      return res.status(400).json({ message: "User email is required!" });
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    // Check whether this book has an active borrow
    const activeBorrow = await borrowCollection.findOne({
      bookId: id,
      status: "borrowed",
    });

    if (activeBorrow) {
      return res.status(400).json({
        message: "This book is currently borrowed. It cannot be deleted!",
      });
    }

    const result = await booksCollection.deleteOne({
      _id: new ObjectId(id),
      userEmail: normalizedEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Book not found or you are not the owner!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully!",
    });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ message: "Failed to delete book" });
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
