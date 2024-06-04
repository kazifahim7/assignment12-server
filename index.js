const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 7000

var jwt = require('jsonwebtoken')

app.use(cors())

app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.afhro9w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

console.log(uri)

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
        // await client.connect();

        const userCollection = client.db("ContestHub").collection('AllUser')
        const creatorCollection = client.db("ContestHub").collection('creatorContest')
        const allContestCollection = client.db("ContestHub").collection('allContest')



        // token implement....

        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            res.send({ token })
        })
        // verify token

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ massage: 'unAuthorized' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    console.log(err)
                    return res.status(401).send({ message: 'Unauthorized access' });
                }
                req.user = decoded
                next()
            })


        }


        // verify admin

        const verifyAdmin = async (req, res, next) => {
            const email = req.user?.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ massage: 'forbidden access' })
            }
            next()

        }


        // add all user in dataBase-----------

        app.post('/users', async (req, res) => {
            const users = req.body;
            const query = {
                email: users.email,
            }
            const existing = await userCollection.findOne(query)
            if (existing) {
                return res.send({ massage: 'already available' })
            }
            const result = await userCollection.insertOne(users)
            res.send(result)
        })

        // all users

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        //  find role :--

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            let position = ''

            if (result) {
                position = result?.role

            }

            res.send({ position })

        })

        // find verified:
        app.get('/users/verified/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            let permission = ''
            if (result) {
                permission = result?.status

            }

            res.send({ permission })
        })


        // get single user by id

        app.get('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        // update role

        app.put('/update/user/role/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const info = req.body;
            const updateDoc = {
                $set: {
                    role: info?.newRole,
                }
            }

            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)

        })

        app.put('/block/user/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const info = req.body;
            const updateDoc = {
                $set: {
                    status: info?.newStatus,
                }
            }

            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)

        })

        app.delete('/delete/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // contest creator....

        app.post('/host/contest', async (req, res) => {
            const info = req.body;
            const result = await creatorCollection.insertOne(info)
            res.send(result)
        })


        app.get('/host/contest/:email', async (req, res) => {
            const email = req.params.email;
            const query = { hostEmail: email }
            const result = await creatorCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/single/contest/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await creatorCollection.findOne(query)
            res.send(result)
        })

        app.put('/updateSingleData/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const info = req.body;
            console.log(info)
            const updateDoc = {
                $set: {
                    contestName: info?.contestName,
                    contestType: info?.contestType,
                    description: info?.description,
                    price: info?.price,
                    prize: info?.prize,
                    task: info?.task,
                    image: info?.image,
                    dates: info?.dates
                }
            }

            const result = await creatorCollection.updateOne(query, updateDoc)
            res.send(result)

        })


        app.delete('/delete/creator/collection/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await creatorCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/allContes/for/Admin', async (req, res) => {
            const result = await creatorCollection.find().toArray()
            res.send(result)
        })

        // one path two work...
        app.post('/add/allContest', async (req, res) => {
            const info = req.body;
            const currentINfo = {

                contestName: info?.contestName,
                contestType: info?.contestType,
                description: info?.description,
                price: info?.price,
                prize: info?.prize,
                task: info?.task,
                image: info?.image,
                dates: info?.dates,
                hostEmail: info?.hostEmail,
                participated: info?.participated,
                hostImage: info?.hostImage,
                hostName: info?.hostName





            }
            const id = info?._id
            console.log(info, id)
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'accepted',
                }
            }
            const update = await creatorCollection.updateOne(query, updateDoc)

            const result = await allContestCollection.insertOne(currentINfo)
            res.send(result)

        })

        app.put('/sendMassage/:id', async (req, res) => {
            const id = req.params.id;
            const info = req.body
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    comments: info?.comments,
                }
            }
            const result = await creatorCollection.updateOne(query, updateDoc)
            res.send(result)

        })


        app.get('/allData/everyone', async (req, res) => {
            const search = req.query?.search
            const sort = req.query?.sort
            console.log(search)
            let query = {
                contestType: { $regex: search, $options: 'i' },

            }
            let option = {}

            if (sort) option = { sort: { participated: sort === 'asc' ? -1 : 1 } }



            const result = await allContestCollection.find(query, option).toArray()
            res.send(result)
        })








        // // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);











app.get('/', (req, res) => {
    res.send('contest hub coming')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
