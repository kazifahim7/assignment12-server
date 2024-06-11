const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 7000

var jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_KEY)

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
        const registerContest = client.db("ContestHub").collection('register')
        const paymentsCollection = client.db("ContestHub").collection('payments')
        const winCollection = client.db("ContestHub").collection('win')
        const upcomingCollection = client.db("ContestHub").collection('upcoming')




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
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await userCollection.find().skip(page*size).limit(size).toArray()
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
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const result = await creatorCollection.find(query).skip(page*size).limit(size).toArray()
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

        app.get('/allContes/for/Admin',verifyToken,verifyAdmin, async (req, res) => {
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)

            const result = await creatorCollection.find().skip(page*size).limit(size).toArray()
            res.send(result)
        })

        // one path two work...
        app.post('/add/allContest', async (req, res) => {
            const info = req.body;
           
            const id = info?._id
            console.log(info, id)
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'accepted',
                }
            }
            const update = await creatorCollection.updateOne(query, updateDoc)

            
            res.send(update)

        })

        app.put('/sendMassage/:id', async (req, res) => {
            const id = req.params.id;
            const info = req.body
            console.log(info,id)
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    comments: info?.comment,
                }
            }
            const result = await creatorCollection.updateOne(query, updateDoc)
            res.send(result)

        })


        app.get('/allData/everyone', async (req, res) => {
            const search = req.query?.search
            const sort = req.query?.sort
            const page=parseInt(req.query.page)
            const size=parseInt(req.query.size)
            console.log(search)
            let query = {
                contestType: { $regex: search, $options: 'i' },

            }
            if(search==undefined){
                return res.send('no data')
            }
            let option = {}

            if (sort) option = { sort: { participated: sort === 'asc' ? -1 : 1 } }



            const result = await creatorCollection.find(query, option).skip(page*size).limit(size).toArray()
            res.send(result)
        })

        app.get(`/singleData/details/:id`,async(req,res)=>{
            const id=req.params.id;
            const query={_id:new ObjectId(id)}
            const result=await creatorCollection.findOne(query)
            res.send(result)
        })


        app.get('/allData-for/home/page',async(req,res)=>{
            const sort = req.query?.sort

            const query={}

            let option = {}

            if (sort) option = { sort: { participated: sort === 'asc' ? -1 : 1 } }
            const result=await creatorCollection.find(query,option).toArray()
            res.send(result)
        })


        app.post('/register/contest',async(req,res)=>{
            const contest=req.body;
            console.log(contest)
            const result=await registerContest.insertOne(contest)
            res.send(result)
        })


        app.get('/getRegisterContest/:email',async(req,res)=>{
            const email=req.params.email 
            const query={
                userEmail:email
            }

            const result=await registerContest.find(query).toArray()
            res.send(result)
            
        })
        app.get('/getSingleContest/:id',async(req,res)=>{
            const id=req.params.id;
            const query={_id: new ObjectId(id)}
            const result= await registerContest.findOne(query)
            res.send(result)
        })


        // payment 
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;

            const amount = parseInt(price * 100)
            const paymentIntent = await stripe.paymentIntents.create({

                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]





            })

            res.send({ clientSecret: paymentIntent.client_secret })

        })


        app.post('/payments',async(req,res)=>{
            const info=req.body;
            const id = info?.ContestId
            const firstId = info.registerId
            const query = { _id: new ObjectId(id) }
            let updateDoc = {   $inc: { participated: 1 }  }
            const update = await creatorCollection.updateOne(query, updateDoc)
           
            
            console.log(id)
           
            
            
            const result= await paymentsCollection.insertOne(info)
            
           
            const filter = { _id: new ObjectId(firstId) }
            const now = await registerContest.deleteOne(filter)
            res.send(result);
        })


        app.get('/myParticipateData/:email',async(req,res)=>{
            const email=req.params.email;
            const sort =req.query.sort
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            console.log(sort)
            let option={}
            if (sort) {
                option = { sort: { ContestDate: sort === 'asc' ? 1 : -1 } }
            }
            const query = { participateUserEmail : email}
            const result=await paymentsCollection.find(query,option).skip(page*size).limit(size).toArray()
            res.send(result)
        })


        app.get('/user/myProfile/:email',async(req,res)=>{
            const email=req.params.email
            const query={email:email}
            const result=await userCollection.findOne(query)
            res.send(result);
        })


        app.patch('/update/profile/:email',async(req,res)=>{
            const info=req.body;
            const email=req.params.email;
            const query={email:email}
            const updateDoc = {
                $set: {
                    name:info.name,
                    image:info.image,
                    location:info.location,
                }
            }
            const options = { upsert: true };
            const result=await userCollection.updateOne(query,updateDoc,options)
            res.send(result)

        })


        app.get('/host/contest/title/:email', async (req, res) => {
            const email = req.params.email;
            const contest = req.query.contest
            console.log(contest)
            const query = {
                 hostEmail: email,
                contestName:contest
                
                }
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
        })


        app.post('/setResult',async(req,res)=>{
            const info=req.body;
            let id1 = info?.submissionId
            const query1={_id:new ObjectId(id1)}
            const updateDoc1 = {
                $set: {
                    status:'winner'
                }
            }
            const result1=await paymentsCollection.updateOne(query1,updateDoc1)


            const query2 = {
                _id: {
                    $in: info.othersId.map(id => new ObjectId(id))
                }
            }

            const updateDoc2 = {
                $set: {
                    status: 'Unsuccess'
                }
            }
            const result2 = await paymentsCollection.updateMany(query2, updateDoc2)

            const query3 = { _id: new ObjectId(info?.ContestId)}
            const options = { upsert: true };

            const updateDoc3 = {
                $set: {
                    participateUserEmail: info?.participateUserEmail,
                    participateUserName: info?.participateUserName,
                    participateUserPhoto: info?.participateUserPhoto
                }
            }
            const result4= await creatorCollection.updateOne(query3,updateDoc3,options)







            const result=await winCollection.insertOne(info)
            res.send(result)
        })


        app.get('/total/winner',async(req,res)=>{
            const result= await winCollection.find().toArray()
            res.send(result)
        })


        app.get('/my-wining/status/:email',async(req,res)=>{
            const email=req.params.email;
            const filter = { participateUserEmail : email}
            const result=await winCollection.find(filter).toArray()
            res.send(result)
        })


        app.get('/upcoming',async(req,res)=>{
            const result=await upcomingCollection.find().toArray()
            res.send(result)
        })



        app.get('/leaderBoard',async(req,res)=>{
            const result=await winCollection.aggregate([
                {
                    $match: { status: 'win' } 
                },
                {
                    $group: {
                        _id: '$participateUserEmail', 
                        winCount: { $sum: 1 } ,
                        winerName: { $first: '$participateUserName' },
                        winerPhoto: { $first: '$participateUserPhoto' },
                    }
                },
                {
                    $sort: { winCount: -1 } 
                },
                {
                    $project: {
                        _id: 0, 
                        participateUserEmail: '$_id', 
                        winCount: 1,  
                        winerName: 1 ,
                        winerPhoto: 1
                    }
                }

            ]).toArray()

            res.send(result)
        })


        app.get('/allData',async(req,res)=>{
            const count=await creatorCollection.estimatedDocumentCount();
            res.send({count})
        })




        app.get('/allusers',async(req,res)=>{
            const count= await userCollection.estimatedDocumentCount()

            res.send({count})

        })

        app.get('/count/host/contest/:email', async (req, res) => {
            const email = req.params.email;
            const query = { hostEmail: email }
            const count = await creatorCollection.countDocuments(query)
            res.send({ count })
        })
        app.get('/count/my/contest/:email', async (req, res) => {
            const email = req.params.email;
            const query = { participateUserEmail: email }
            const count = await paymentsCollection.countDocuments(query)
            res.send({ count })
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
