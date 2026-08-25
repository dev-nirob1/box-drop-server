const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;


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
        app.get('/', (req, res) => {
            res.send('Hello World')
        })




        await client.connect();
        console.log(
            'Pinged your deployment. You successfully connected to MongoDB!'
        );




    } catch (error) {
        console.log(error.message);
    }

}
server();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
