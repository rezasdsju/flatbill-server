import express from 'express';
import type { RequestHandler } from 'express';
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, MongoServerError, ObjectId, type Document } from 'mongodb';
import jwt from 'jsonwebtoken'
import { validateFields } from './validateField.js';

interface UserDocument extends Document {
  _id: ObjectId;
  email: string;
  role: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user: UserDocument;
    }
  }
}

const app = express();
app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000;






const client = new MongoClient(process.env.MONGODB_URI!);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
    throw err;
  }
}

const mongoConnection = await connectToMongoDB()
const database = mongoConnection.db('flatbill')
const flats = database.collection('flats')
const buildings = database.collection('buildings')
const users = database.collection<UserDocument>('user')
await flats.createIndex(
  { buildingId: 1, flatNumber: 1 },
  { unique: true },
  {}
)



const verifyToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    if (typeof decoded === 'string' || typeof decoded.email !== 'string') {
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    const user = await users.findOne({ email: decoded.email })
    if (!user) {
      return res.status(401).send({ message: 'Unauthorized' })
    }
    req.user = user
    next()
  } catch (error) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
}

const verifyFlatOwner: RequestHandler = async (req, res, next) => {
  if (req.user.role !== 'flat-owner') {
    res.status(403).send({ message: 'Forbidden Access' })
    return
  }
  next()
}






app.post('/jwt', async (req, res) => {
  try {
    if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    const { email } = req.body
    if (!email) return res.status(400).send({ message: 'Email is required' })
    const user = await users.findOne({ email })
    if (!user) return res.status(404).send({ message: 'User not found' })
    const token = jwt.sign(
      {
        email: user.email, role: user.role
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d'
      }
    )
    res.send({ token })
  } catch (error) {
    console.error('POST /jwt failed:', error)
    res.status(500).send({ message: 'Server error' })
  }
})

app.get('/', (req, res) => {
  res.send('Hello World!');
});



// Flat Owner
app.post('/flat-owner/flats', verifyToken, verifyFlatOwner, async (req, res) => {
  try {
    const data = req.body;

    const buildingName =
      typeof data?.buildingName === 'string'
        ? data.buildingName.trim()
        : '';

    const existingBuilding = buildingName
      ? await buildings.findOne({
        name: buildingName,
        'buildingOwner.email': req.user.email
      })
      : null;

    const validatedData = await validateFields(
      req,
      res,
      data,
      req.user,
      existingBuilding,
      buildings,
      'POST'
    );

    if (!validatedData) return;

    const dataToInsertInFlats = {
      ...validatedData.data,

      flatOwner: {
        _id: req.user._id,
        name: req.user.name ?? null,
        email: req.user.email,
        phone: req.user.phone ?? null,
        address: req.user.address ?? null,
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await flats.insertOne(dataToInsertInFlats);

    if (!result.acknowledged || !result.insertedId) {
      return res.status(500).json({
        success: false,
        message: 'Insert not acknowledged'
      });
    }

    res.status(201).send({
      success: true,
      message: 'Flat added successfully',
      insertedId: result.insertedId
    });

  } catch (err) {
    console.error('POST /flat-owner/flats failed:', err);

    if (err instanceof MongoServerError && err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Flat already exists in this building'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add flat'
    });
  }
});


app.get('/flat-owner/flats', verifyToken, verifyFlatOwner, async (req, res) => {
  try {
    const query = {
      'flatOwner._id': req.user._id
    }
    const result = await flats.find(query).sort({ createdAt: -1 }).toArray()
    res.send(result)
  } catch (err) {
    console.error('GET /flat-owner/flats failed:', err)
    res.status(500).send({ message: 'Failed to fetch flats' })
  }
})



app.get('/flat-owner/flats/:id', verifyToken, verifyFlatOwner, async (req, res) => {
  try {
    const id = req.params.id
    if (typeof id !== 'string') {
      return res.status(400).send({ message: 'Invalid flat ID' })
    }
    const query = {
      _id: new ObjectId(id),
      'flatOwner._id': req.user._id
    }
    const result = await flats.findOne(query)
    if (!result) {
      return res.status(404).send({ message: 'Flat not Found' })
    }
    res.send(result)
  } catch (err) {
    console.error('GET /flat-owner/flats/:id failed:', err)
    res.status(500).send({ message: 'Failed to fetch flats' })
  }
})

















app.patch('/flat-owner/flats/:id', verifyToken, verifyFlatOwner, async (req, res) => {
  try {
    const id = req.params.id;

    if (typeof id !== 'string' || !ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid flat ID' });
    }

    const query = {
      _id: new ObjectId(id),
      'flatOwner._id': req.user._id
    };

    const matchedFlat = await flats.findOne(query);

    if (!matchedFlat) {
      return res.status(404).send({ message: 'Flat not found' });
    }

    const data = req.body;

    const buildingName =
      typeof data?.buildingName === 'string'
        ? data.buildingName.trim()
        : matchedFlat.buildingName;

    const existingBuilding = buildingName
      ? await buildings.findOne({
        name: buildingName,
        'buildingOwner.email': req.user.email
      })
      : null;

    const validatedData = await validateFields(
      req,
      res,
      data,
      req.user,
      existingBuilding,
      buildings,
      'PATCH',
      matchedFlat
    );

    if (!validatedData) return;

    const result = await flats.updateOne(query, {
      $set: {
        ...validatedData.data,
        updatedAt: new Date().toISOString()
      }
    });

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: 'Flat not found' });
    }

    res.send({
      success: true,
      message: 'Flat updated successfully'
    });

  } catch (err) {
    console.error('PATCH /flat-owner/flats/:id failed:', err);

    if (err instanceof MongoServerError && err.code === 11000) {
      return res.status(409).send({
        success: false,
        message: 'Flat already exists in this building'
      });
    }

    res.status(500).send({
      success: false,
      message: 'Failed to update flat'
    });
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app;