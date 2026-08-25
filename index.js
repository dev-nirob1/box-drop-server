const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();
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
