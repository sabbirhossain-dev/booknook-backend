import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;

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
app.post("/borrows", async (req, res) => {
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
    // const existingUserBorrow = await borrowCollection.findOne({
    //   userEmail: userEmail.trim().toLowerCase(),
    //   bookId: bookId.toString(),
    //   status: "borrowed",
    // });

    // if (existingUserBorrow) {
    //   return res.status(400).json({
    //     message: "You have already borrowed this book!",
    //   });
    // }

    const normalizedEmail = userEmail.trim().toLowerCase();
    const normalizedBookId = bookId.toString();

    const matchingBorrows = await borrowCollection
      .find({
        userEmail: normalizedEmail,
        bookId: normalizedBookId,
      })
      .toArray();

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

    //data save
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

//get borrows
app.get("/borrows", async (req, res) => {
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

// Return borrow
// app.patch("/borrows/:id/return", async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate borrow ID
//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         message: "Invalid borrow ID!",
//       });
//     }

//     // Find borrow by ID first
//     const borrow = await borrowCollection.findOne({
//       _id: new ObjectId(id),
//     });

//     console.log("Requested ID:", id);
//     console.log("Found Borrow:", borrow);

//     if (!borrow) {
//       return res.status(404).json({
//         message: "Borrow record not found!",
//       });
//     }

//     console.log("Current Status:", borrow.status);

//     // Check borrow status
//     if (borrow.status !== "borrowed") {
//       return res.status(400).json({
//         message: "This book is already returned!",
//       });
//     }

//     // Update status only if still borrowed
//     const updateBorrow = await borrowCollection.updateOne(
//       {
//         _id: new ObjectId(id),
//         status: "borrowed",
//       },
//       {
//         $set: {
//           status: "returned",
//           returnedAt: new Date(),
//         },
//       },
//     );

//     if (updateBorrow.modifiedCount === 0) {
//       return res.status(400).json({
//         message: "Book already returned!",
//       });
//     }

//     // Increase book copies
//     const updateBook = await booksCollection.updateOne(
//       {
//         _id: new ObjectId(borrow.bookId),
//       },
//       {
//         $inc: {
//           totalCopies: 1,
//         },
//       },
//     );

//     if (updateBook.matchedCount === 0) {
//       // Rollback status
//       await borrowCollection.updateOne(
//         {
//           _id: new ObjectId(id),
//           status: "returned",
//         },
//         {
//           $set: { status: "borrowed" },
//           $unset: { returnedAt: "" },
//         },
//       );

//       return res.status(404).json({
//         message: "Book not found!",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Book returned successfully!",
//     });
//   } catch (error) {
//     console.error("Return Book Error:", error);

//     res.status(500).json({
//       message: "Internal Server Error",
//     });
//   }
// });

app.patch("/borrows/:id/return", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid borrow ID!",
      });
    }

    const borrow = await borrowCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!borrow) {
      return res.status(404).json({
        message: "Borrow record not found!",
      });
    }

    if (borrow.status !== "borrowed") {
      return res.status(400).json({
        message: "This book is already returned!",
      });
    }

    // Update borrow status
    const updateBorrow = await borrowCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "borrowed",
      },
      {
        $set: {
          status: "returned",
          returnedAt: new Date(),
        },
      },
    );

    if (updateBorrow.modifiedCount === 0) {
      return res.status(400).json({
        message: "Book already returned!",
      });
    }

    // Find the original book
    const book = await booksCollection.findOne({
      _id: new ObjectId(borrow.bookId),
    });

    // Increase stock only if the original book still exists
    if (book) {
      await booksCollection.updateOne(
        { _id: new ObjectId(borrow.bookId) },
        { $inc: { totalCopies: 1 } },
      );
    }

    res.status(200).json({
      success: true,
      message: book
        ? "Book returned successfully!"
        : "Borrow record closed. Original book no longer exists.",
    });
  } catch (error) {
    console.error("Return Book Error:", error);

    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

// Start the server
app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
