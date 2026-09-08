require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}))
app.use(cookieParser());

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
        const parcelsCollection = db.collection('parcels');

        // verify token middleware 
        const verifyToken = (req, res, next) => {
            const token = req.cookies.token;
            if (!token) {
                return res.status(401).json({ message: 'Unauthorized access' });
            };

            try {
                const decode = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decode;
                next()
            } catch (error) {
                return res.status(401).json({
                    message: 'Invalid or expired token'
                });
            }
        }
        //verfiy admin middleware
        const verifyAdmin = (req, res, next) => {
            const role = req.user.role;
            if (role === 'admin') {
                next()
            }
            else {
                res.status(403).json({ message: 'Forbidden Access' })
            }
        }

        app.get('/api/users', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const result = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
                res.status(200).json(result);
            } catch (error) {
                res.status(500).json({
                    message: error.message
                })
            }
        })
        //create user 
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

                // override body data for safety  //todo//
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

        //login route 
        app.post('/api/auth/login', async (req, res) => {
            try {
                // get body from frontend 
                const loginData = req.body;
                // console.log(req.body)
                // destructure phone and password
                const { phone, password } = loginData;

                // console.log('password', password)
                // check phone and password is empty or not 
                if (!phone || !password) {
                    return res.status(400).json({ message: 'Phone number and Password required' })
                }
                // check user exists or not
                const existingUser = await usersCollection.findOne({ phone })

                // if not found return with a response message 
                if (!existingUser) {
                    return res.status(401).json({ message: 'Invalid Phone or password' })
                }

                // compare password 
                const isValidPassword = await bcrypt.compare(password, existingUser.password);

                if (!isValidPassword) {
                    return res.status(401).json({ message: 'Invalid phone number or password' })
                }

                // generate jwt secret token
                const token = jwt.sign({ userId: existingUser._id.toString(), phone: existingUser.phone, role: existingUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' })

                const userInfo = { name: existingUser.name, phone: existingUser.phone, role: existingUser.role, userId: existingUser._id.toString() };

                // set token to cookie 
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: false
                })
                res.status(200).json({ message: 'Login successful', user: userInfo })

            } catch (error) {
                res.status(500).json({ message: error.message })
            }
        })

        app.get('/api/auth/me', verifyToken, (req, res) => {
            const user = req.user;

            res.status(200).json({
                message: 'User Logged in',
                user
            });
        });
        app.post('/api/auth/logout', (req, res) => {
            res.clearCookie('token');

            res.status(200).json({
                message: 'Logout successful'
            });
        });

        // parcels route 
        // get all parcel 
        app.get('/api/parcels', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const result = await parcelsCollection.find().toArray();
                res.status(200).json({
                    message: 'All Parcel',
                    result
                })
            } catch (error) {
                res.status(500).json({
                    message: error.message
                })
            }
        })
        // admin overview of all parcels with status and count
        // admin overview of all parcels

        app.get('/api/parcels/overview', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const total = await parcelsCollection.countDocuments();

                const booked = await parcelsCollection.countDocuments({
                    status: "Booked"
                });

                const onTheWay = await parcelsCollection.countDocuments({
                    status: "On the Way"
                });

                const delivered = await parcelsCollection.countDocuments({
                    status: "Delivered"
                });

                res.status(200).json({
                    message: "Parcel overview retrieved successfully",
                    result: {
                        total,
                        booked,
                        onTheWay,
                        delivered
                    }
                });

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    message: "Unable to retrieve parcel overview."
                });
            }
        });

        // get parcel details using trackingId

        app.get('/api/parcels/:trackingId', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const trackingId = req.params.trackingId;

                const result = await parcelsCollection.findOne({ trackingId });
                if (!result) {
                    return res.status(404).json({
                        message: 'Parcel not found. Please check the tracking ID.'
                    });
                }
                res.status(200).json({
                    message: 'Parcel details retrieved successfully',
                    result
                });

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    message: 'Unable to retrieve parcel details. Please try again later.'
                });
            }
        });

        // get parcel details using trackingId without authentication
        app.get('/api/track/:trackingid', async (req, res) => {
            try {
                const trackingId = req.params.trackingid;
                const data = {
                    projection: { _id: 0, trackingId: 1, statusHistory: 1, status: 1, bookingDate: 1 }
                }
                const result = await parcelsCollection.findOne({ trackingId }, data);
                if (!result) {
                    return res.status(404).json({
                        message: 'Parcel not found. Please check the tracking ID.'
                    });
                }
                res.status(200).json({
                    message: 'Parcel details retrieved successfully',
                    result
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    message: 'Unable to retrieve parcel details. Please try again later.'
                });
            }
        });

        // get all parcels for a specific user
        app.get('/api/user/parcels', verifyToken, async (req, res) => {
            try {
                const phone = req.user.phone;

                const result = await parcelsCollection.find({
                    $or: [
                        { senderPhone: phone },
                        { receiverPhone: phone }
                    ]
                }).toArray();

                res.status(200).json({
                    message: 'User parcels retrieved successfully',
                    result
                });

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    message: 'Unable to retrieve user parcels.'
                });
            }
        });

        // add new parcel 
        app.post('/api/parcels', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const parcelData = req.body;
                const result = await parcelsCollection.insertOne({
                    ...parcelData, trackingId: 'ORD-' + new ObjectId(),
                    status: 'Booked',
                    statusHistory: [
                        {
                            status: "Booked",
                            date: new Date()
                        }
                    ],
                    bookingDate: new Date()
                })

                res.status(201).json({ message: 'Parcel created successfully', parcelId: result.insertedId })

            } catch (error) {
                res.status(500).json({
                    message: "Failed to create parcel",
                });
            }
        })

        // update parcel status 
        app.patch('/api/parcels/:trackingId', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const trackingId = req.params.trackingId;
                const { status } = req.body;
                const updatedData = {
                    $set: { status },
                    $push: {
                        statusHistory: {
                            status,
                            updatedAt: new Date(),
                        },
                    }
                }
                const result = await parcelsCollection.updateOne({ trackingId }, updatedData);

                res.status(201).json({ message: 'Parcel status updated successfully', result })

            } catch (error) {
                res.status(500).json({
                    message: "Failed to update parcel status"
                })
            }
        })

        app.get('/', (req, res) => {
            res.send('Hello World')
        })

        console.log(
            'Connected to MongoDB!'
        );

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        })

    } catch (error) {
        console.log(error.message);
    }

}
server();

