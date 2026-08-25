require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const mongodbURI = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.om5nma1.mongodb.net/?appName=Cluster0`

const client = new MongoClient(mongodbURI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function server() {

    try {
        await client.connect();

        const db = client.db('box-drop');
        const usersCollection = db.collection('users');

        app.get('/api/users', async (req, res) => {
            try {
                const result = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
                res.status(200).json(result);
            } catch (error) {
                res.status(500).json({
                    message: error.message
                })
            }
        })

        app.post('/api/users', async (req, res) => {
            try {
                const user = req.body;
                // destructuring body 
                const { name, phone, password } = user;
                if (!name || !phone || !password) {
                    return res.status(400).json({
                        message: 'Name, phone and password are required'
                    });
                }
                // query for existing user or not
                const existingUser = await usersCollection.findOne({ phone });

                if (existingUser) {
                    return res.status(409).json({
                        message: 'User already exists'
                    });
                };
                // password hashing 
                const hashedPassword = await bcrypt.hash(password, 10);

                // override body data for safety 
                const newUser = { name, phone, password: hashedPassword, createdAt: new Date(), role: 'user' };

                // sending response 
                const result = await usersCollection.insertOne(newUser);
                res.status(201).json({ message: 'User created successfully', insertedId: result.insertedId });

            } catch (error) {
                res.status(500).json({
                    message: error.message,
                });
            }
        })


        app.get('/', (req, res) => {
            res.send('Hello World')
        })




        console.log(
            'Connected to MongoDB!'
        );




    } catch (error) {
        console.log(error.message);
    }

}
server();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
