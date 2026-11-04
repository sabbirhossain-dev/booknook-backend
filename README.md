# 📚 BookNook – Backend API

BookNook Backend is a RESTful API built with Express.js and MongoDB to manage books, user borrowing activities, book availability, and returns securely.

## 🌐 Project Links

- **Frontend Repository:** https://github.com/sabbirhossain-dev/booknook-frontend
- **Backend Repository:** https://github.com/sabbirhossain-dev/booknook-backend

---

## ✨ Key Features

- 📖 **Get All Books:** Retrieve all available books from the MongoDB database.
- 🔍 **Get Book Details:** Fetch detailed information about a specific book.
- ➕ **Add Books:** Authenticated users can add new books to the library.
- ✏️ **Update Books:** Book owners can update their book information.
- 🗑️ **Delete Books:** Owners can delete their books with ownership verification.
- 📚 **Borrow Books:** Users can borrow available books with an automatic return date.
- 🔄 **Return Books:** Users can return borrowed books and update available copies.
- 📦 **Stock Management:** Available book copies are automatically decreased and increased.
- 🚫 **Duplicate Borrow Prevention:** Prevents users from borrowing the same book multiple times simultaneously.
- 🔐 **JWT Authentication:** Protects private API endpoints using JSON Web Token verification.
- 👤 **User Authorization:** Users can access their own books and borrowing records.
- ⚡ **MongoDB Transactions:** Maintains consistency during borrowing and returning operations.

---

## 🛠️ Technologies Used

- Node.js
- Express.js
- MongoDB
- MongoDB Native Driver
- JavaScript
- JWT Authentication
- JOSE
- CORS
- dotenv

---

## 📡 API Endpoints

| Method | Endpoint       | Description                  | Access  |
| ------ | -------------- | ---------------------------- | ------- |
| GET    | `/books`       | Get all books                | Public  |
| GET    | `/books/:id`   | Get a single book            | Private |
| POST   | `/books`       | Add a new book               | Private |
| PATCH  | `/books/:id`   | Update a book                | Private |
| DELETE | `/books/:id`   | Delete a book                | Private |
| POST   | `/borrows`     | Borrow a book                | Private |
| GET    | `/borrows`     | Get logged-in user's borrows | Private |
| DELETE | `/borrows/:id` | Return a borrowed book       | Private |

---

## 🔐 Authentication & Security

- JWT verification using JOSE.
- Better Auth JWKS public key verification.
- Protected routes require a valid Bearer token.
- User identity is extracted from the verified JWT.
- Users can manage only their own books.
- Users can view only their own borrowing records.
- Duplicate active borrowing is prevented.
- MongoDB transactions help maintain data consistency.

---

## 📚 Borrowing System

- Users can borrow books if copies are available.
- Available copies decrease automatically after borrowing.
- Each borrowing record includes a borrowing date.
- Users cannot borrow the same book twice simultaneously.
- Returning a book increases the available copies.
- Returned borrowing records are retained in the database.

---

## 🚀 Getting Started

Follow these steps to run the backend locally.

### Prerequisites

Make sure you have installed:

- Node.js (LTS version)
- npm
- Git
- MongoDB Atlas account

### Step 1: Clone the Repository

```bash
git clone https://github.com/sabbirhossain-dev/booknook-backend.git
```

### Step 2: Navigate to the Project Directory

```bash
cd booknook-backend
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:3000
```

Replace the placeholder values with your actual MongoDB connection string and frontend URL.

### Step 5: Run the Development Server

```bash
npm run dev
```

Or run directly:

```bash
node index.js
```

The backend server will start at:

```text
http://localhost:5000
```

---

## 🗄️ Database Structure

**Database Name:** `booknookDB`

### Books Collection

Stores book information, including:

- Title
- Author
- Category
- Image
- Description
- Total Copies (available copies)
- User Name
- User Email
- Date Added

### Borrow Collection

Stores borrowing information, including:

- Book ID
- Book Title
- Author
- Image
- Category
- User Name
- User Email
- Borrow Date
- Return Date
- Borrow Status
- Returned Date

---

## 🌍 Deployment

The backend can be deployed using platforms such as:

- Render
- Railway

MongoDB Atlas is used for cloud database hosting.

**Note:** MongoDB transactions require a replica set or sharded cluster. MongoDB Atlas supports this requirement.

---

## 👨‍💻 Author

**Sabbir Hossain**

- GitHub: https://github.com/sabbirhossain-dev
- Frontend: https://github.com/sabbirhossain-dev/booknook-frontend
- Backend: https://github.com/sabbirhossain-dev/booknook-backend

---

## 📄 License

This project was developed for educational purposes as an online library management system.

---

<p align="center">
  <strong>📚 BookNook – Discover Books, Share Knowledge, and Enjoy Reading!</strong>
</p>
