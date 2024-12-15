const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'bfshopper',
    host: 'localhost',
    database: 'easyshopper',
    password: 'bfeasy',
    port: 5432
});

// 1. Login validation 
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2 ",
        [username, password]);

        console.log(result.rows);

        if(result.rows.length > 0) {
            res.status(200).json({ message : "Log in succesful", 
            user: {
                id: result.rows[0].id, 
                username: result.rows[0].username, 
                role: result.rows[0].role
            }
        });

        } else {
            res.status(401).json({ message : "Invalid Username/Password", })
        }
    } catch(err) {
        console.error(err);
        res.status(500).json({ message : "Error logging in" })
    }
    
});

// 2. register new user
app.post('/register', async (req, res) => {
    const {username, email, password} = req.body;
    try{
        const result = await pool.query("SELECT * FROM users WHERE username = $1 OR email = $2", 
        [username, email]);

        // console.log(result);

        if(result.rows.length > 0) {
            res.status(400).json({ message : "User/Email already exists"})
        }

        await pool.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", 
        [username, email, password]);
        res.status(200).json({ message : "Registration succesfully"});
    } catch(err) {
        res.status(500).json({ message : "Error registering user"});
    }
})

// 3. get all products
app.get('/products', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch(err) {
        res.status(500).json({ message : "Error fetching products"});
    }
});

// 4. Add a new product for admin
app.post('/addproduct', async (req, res) => {
    try {
        const { name, description, price, quantity, image_url } = req.body;

        if (price <= 0 || quantity < 0) {
            return res.status(400).json({ error: 'Invalid price or quantity' });
        }

        await pool.query(`INSERT INTO products (name, description, price, quantity, image_url) 
        VALUES ($1, $2, $3, $4, $5);`, [name, description, price, quantity, image_url]);

        res.status(201).json({ message : 'Product added successfully'});
    } catch (error) {
        res.status(500).json({ message : "Error addin product" });
    }
  });

// 5. Delete a product by ID
app.delete('/deleteproduct/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM products WHERE id = $1", [id]);
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
// 6. get all orders of the user
app.get('/orders/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT o.id, o.order_number, o.status, o.total_price, o.order_date
            FROM orders o WHERE o.user_Id = $1`, [userId]
        );
        res.json(result.rows);

    } catch(err) {
        res.status(500).json({ message : "Error fetching orders"});
    }
});

// 7. get each order details for the user
app.get('/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try{
        const result = await pool.query(
            `SELECT o.id, o.order_number, o.status, o.total_price, o.order_date,
            p.id, p.name, p.description, op.quantity, op.total_price AS product_total
            FROM orders o JOIN order_products op ON o.id = op.order_id 
            JOIN products p ON op.product_id = p.id
            WHERE op.order_id = $1`, [orderId]
        );

        const orderDetails = {
            order_id: result.rows[0].id,
            order_number: result.rows[0].order_number,
            status: result.rows[0].status,
            total_price: result.rows[0].total_price,
            order_date: result.rows[0].order_date,
            products: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                quantity: row.quantity,
                total: row.product_total
            }))
        }

        res.json(orderDetails);
    }catch(err) {
        res.status(500).json({ message : "Error fetching order details" })
    }
});

// create new order for the user
app.post('/neworder', async (req, res) => {
    try {
        const { user_id, cart, order_date } = req.body;
        let totalPrice = 0;
  
      // Insert a new order
      const orderQuery = `
        INSERT INTO orders (user_id, total_price, order_date)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      cart.forEach(item => {
        totalPrice += item.price * item.quantity;
      });
  
      const orderResult = await pool.query(orderQuery, [user_id, totalPrice, order_date]);
      const orderId = orderResult.rows[0].id;
  
      // Add products to the order_products table
      const insertOrderProductsQuery = `
        INSERT INTO order_products (order_id, product_id, quantity, total_price)
        VALUES ($1, $2, $3, $4)
      `;
      for (const product of cart) {
        await pool.query(insertOrderProductsQuery, [
          orderId,
          product.id,
          product.quantity,
          product.price * product.quantity
        ]);
      }
  
      res.status(201).json({ message: 'Order submitted successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

app.listen(5001, () => console.log('Server is running on http://localhost:5001'))
