import express from 'express';
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken'

const app = express();
app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000;






const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoConnection = await connectToMongoDB()
const database = mongoConnection.db('flatbill')
const flats = database.collection('flats')
const buildings = database.collection('buildings')
const users = database.collection('user')




const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer')) {
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
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

const verifyFlatOwner = async (req, res, next) => {
  if (req.user.role !== 'flat-owner') {
    res.status(403).send({ message: 'Forbidden Access' })
    return
  }
  next()
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});




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
      process.env.JWT_SECRET,
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
// Flat Owner
app.post('/flat-owner/flats', verifyToken, verifyFlatOwner, async (req, res) => {
  try {
    const data = req.body
    const optionalNumber = (value) => {
      if (value === "" || value === null || value === undefined) return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const optionalString = (value) => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      return str === "" ? null : str;
    };
    const optionalBoolean = (value) => {
      return value === true || value === "on" || value === "true";
    };
    const buildingName = data.buildingName.trim()
    const existingBuilding = await buildings.findOne({
      name: buildingName,
      'owner.email': req.user.email
    })
    let buildingId;
    if (existingBuilding) {
      buildingId = existingBuilding._id
    } else {
      const newAddBuildingResult = await buildings.insertOne({
        name: buildingName,
        owner: {
          _id: req.user._id,
          name: req.user.name ?? null,
          email: req.user.email,
          phone: req.user.phone ?? '',
          address: req.user.address ?? ''
        },
        createdAt: new Date(),
      })
      buildingId = newAddBuildingResult.insertedId
    }

    const dataToInsertInFlats = {
      // Required fields — direct
      buildingId: buildingId,
      buildingName: data.buildingName,
      flatNumber: data.flatNumber,
      floor: data.floor,
      gasType: data.gasType,
      electricityType: data.electricityType,
      monthlyRent: Number(data.monthlyRent),
      serviceCharge: Number(data.serviceCharge),
      rentalCategory: data.rentalCategory,
      status: data.status ?? "Vacant",

      // Optional number fields
      sizeSqFt: optionalNumber(data.sizeSqFt),
      bedrooms: optionalNumber(data.bedrooms),
      attachedBathrooms: optionalNumber(data.attachedBathrooms),
      commonBathrooms: optionalNumber(data.commonBathrooms),
      balconies: optionalNumber(data.balconies),
      waterBillFixed: optionalNumber(data.waterBillFixed),
      garbageBillFixed: optionalNumber(data.garbageBillFixed),
      securityDeposit: optionalNumber(data.securityDeposit),

      // Computed total (both optional → 0 if both empty)
      totalBathRooms:
        (optionalNumber(data.attachedBathrooms) ?? 0) +
        (optionalNumber(data.commonBathrooms) ?? 0),

      // Optional strings
      facing: optionalString(data.facing),
      gasMeterOrAccountNo: optionalString(data.gasMeterOrAccountNo),
      electricityMeterNo: optionalString(data.electricityMeterNo),
      parkingSlotNo: optionalString(data.parkingSlotNo),
      notes: optionalString(data.notes),
      flatOwner: optionalString(data.flatOwner),

      // Booleans (checkbox)
      hasDrawingDining: optionalBoolean(data.hasDrawingDining),
      hasServantRoom: optionalBoolean(data.hasServantRoom),
      hasParking: optionalBoolean(data.hasParking),
      hasLift: optionalBoolean(data.hasLift),
      hasGenerator: optionalBoolean(data.hasGenerator),

      // Defaults
      currentDueAmount: Number(data.currentDueAmount ?? 0),
      currentMonthBillStatus: data.currentMonthBillStatus ?? "N/A",
      presentTenants: data.presentTenants ?? [],
      pastTenants: data.pastTenants ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = await flats.insertOne(dataToInsertInFlats)
    if (!result.acknowledged || !result.insertedId) {
      return res.status(500).json({ success: false, message: "Insert not acknowledged" });
    }

    res.send(result)

  } catch (err) {
    console.error("POST /flat-owner/flats failed:", err);
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to add flat",
    });
  }
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app;