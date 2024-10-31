const http = require('http');
const fs = require('fs');
const url = require('url');

const PORT = process.env.PORT || 3000;
const API_KEY = 'test_api_key_12345'; // Replace with your API key
const DATA_FILE = 'books.json';

// Middleware to read books data from JSON file
const readBooksData = () => {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
};

// Middleware to write books data to JSON file
const writeBooksData = (books) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2));
};

// Validate book data
const validateBook = (book) => {
    const { title, author, publisher, publishedDate, isbn } = book;
    if (!title || !author || !isbn  || !publishedDate  || !publisher) {

        return { valid: false, message: 'Title, Author, and ISBN are required fields.' };
    }
    if (isNaN(isbn)) {
        return { valid: false, message: 'ISBN should be a valid number.' };
    }
    return { valid: true };
};

// Create server
const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');

    // Handle API key authorization
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized: Invalid API Key' }));
    }

    const parsedUrl = url.parse(req.url, true);
    const method = req.method;

    // GET: Retrieve all books or a specific book by ISBN
    if (method === 'GET' && parsedUrl.pathname === '/books') {
        const books = readBooksData();
        if (parsedUrl.query.isbn) {
            const book = books.find(b => b.isbn === parsedUrl.query.isbn);
            if (!book) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Book not found.' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(book));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(books));
    }

    // POST: Add a new book
    if (method === 'POST' && parsedUrl.pathname === '/books') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const newBook = JSON.parse(body);
            const validation = validateBook(newBook);
            if (!validation.valid) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: validation.message }));
            }
            const books = readBooksData();
            books.push(newBook);
            writeBooksData(books);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(newBook));
        });
        return;
    }

    // PUT: Update an existing book
    if (method === 'PUT' && parsedUrl.pathname.startsWith('/books/')) {
        const isbn = parsedUrl.pathname.split('/')[2];
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const updatedBook = JSON.parse(body);
            const validation = validateBook(updatedBook);
            if (!validation.valid) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: validation.message }));
            }
            const books = readBooksData();
            const index = books.findIndex(b => b.isbn === isbn);
            if (index === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Book not found.' }));
            }
            books[index] = { ...books[index], ...updatedBook };
            writeBooksData(books);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(books[index]));
        });
        return;
    }

    // DELETE: Remove a book by ISBN
    if (method === 'DELETE' && parsedUrl.pathname.startsWith('/books/')) {
        const isbn = parsedUrl.pathname.split('/')[2];
        const books = readBooksData();
        const index = books.findIndex(b => b.isbn === isbn);
        if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Book not found.' }));
        }
        books.splice(index, 1);
        writeBooksData(books);
        res.writeHead(204);
        return res.end();
    }

    // Handle 404 for all other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
