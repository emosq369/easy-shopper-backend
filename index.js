const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'eric',
  host: 'localhost',
  database: 'wgpg',
  password: 'PSQLPwd',
  port: 5432
});

// ------------------------------------
//           PRODUCT ROUTES 
// ------------------------------------

// 1. Get all products
app.get('/products', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Add a new product
app.post('/products', async (req, res) => {
  try {
    const { product_name, description, price, quantity } = req.body;
    const query = `
      INSERT INTO products (product_name, description, price, quantity) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [product_name, description, price, quantity]);
    res.status(201).json({ message: 'Product added successfully', product: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete a product by ID
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE product_id = $1", [id]);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Edit a product by ID
app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, description, price, quantity } = req.body;

    const query = `
      UPDATE products 
      SET product_name = $1, description = $2, price = $3, quantity = $4 
      WHERE product_id = $5 
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [product_name, description, price, quantity, id]);
    res.status(200).json({ message: 'Product updated successfully', product: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ------------------------------------
//           SERVER 
// ------------------------------------

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
