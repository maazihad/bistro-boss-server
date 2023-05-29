const express = require('express');
const app = express();
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');

const port = process.env.PORT || 5333;

app.use(cors());
app.use(express.json());

// ==============jwt middleware
const verifyJWT = (req, res, next) => {
   const authorization = req.headers.authorization;
   if (!authorization) {
      return res.status(401).send({ error: true, message: "Invalid authorization" });
   }

   // [bearer token] so it is second index
   const token = authorization.split(' ')[1];
   // verify
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
      if (error) {
         return res.status(403).send({ error: true, message: "Forbidden authorization" });
      }
      req.decoded = decoded;
      next();
   });
};


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xu5udz0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();

      const usersCollection = client.db("bistroBossDb").collection("users");
      const menuCollection = client.db("bistroBossDb").collection("menu");
      const reviewCollection = client.db("bistroBossDb").collection("reviews");
      const cartCollection = client.db("bistroBossDb").collection("carts");

      //============jwt apis
      // async not user because here is no async
      app.post('/jwt', (req, res) => {
         const user = req.body;
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
         res.send({ token });
      });


      //===========user related apis
      app.get("/users", async (req, res) => {
         const result = await usersCollection.find().toArray();
         res.send(result);
      });

      app.post('/users', async (req, res) => {
         const user = req.body;
         // ==================in the below, it is only for google signin
         const query = { email: user.email };
         console.log(query);
         const existingUser = await usersCollection.findOne(query);
         console.log("Existing user : ", existingUser);
         if (existingUser) {
            return res.send({ message: "user already exists" });
         }
         const result = await usersCollection.insertOne(user);
         console.log(result);
         res.send(result);
      });


      // admin related apis
      app.patch("/users/admin/:id", async (req, res) => {
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const updateDoc = {
            $set: {
               role: "admin"
            },
         };
         const result = await usersCollection.updateOne(filter, updateDoc);
         res.send(result);
      });

      app.delete("/users/admin/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await usersCollection.deleteOne(query);
         res.send(result);
      });



      // menu related apis
      app.get('/menu', async (req, res) => {
         const result = await menuCollection.find({}).toArray();
         res.send(result);
      });

      app.get('/reviews', async (req, res) => {
         const result = await reviewCollection.find({}).toArray();
         res.send(result);
      });

      app.get('/carts', verifyJWT, async (req, res) => {
         const email = req.query.email;
         if (!email) {
            res.send([]);
         }

         // ========verify jwt
         const decodedEmail = req.decoded.email;
         if (email !== decodedEmail) {
            return res.status(403).send({ error: true, message: "Forbidden authorization" });
         }

         const query = { email: email };
         const result = await cartCollection.find(query).toArray();
         res.send(result);
      });

      app.post('/carts', async (req, res) => {
         const item = req.body;
         console.log(item);
         const result = await cartCollection.insertOne(item);
         console.log(result);
         res.send(result);
      });

      app.delete('/carts/:id', async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await cartCollection.deleteOne(query);
         res.send(result);
      });

      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);









app.get('/', (req, res) => {
   res.send("Bistro boss is running....");
});


app.listen(port, () => {
   console.log(`Bistro boss is running on port ${port}`);
});


/**
 * ----------------------------------------
 *        Naming Convention
 * ----------------------------------------
 * users : userCollection
 * 
 * 
 * app.get('/users')
 * app.get('/user/:id')
 * app.post('/users')
 * app.patch('/users/:id')
 * app.put('/users/:id')
 * app.delete('/users/:id')
 * 
 * 
 *     
 * **/