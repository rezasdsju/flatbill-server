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
    throw err;
  }
}

const mongoConnection = await connectToMongoDB()
const database = mongoConnection.db('flatbill')
const flats = database.collection('flats')
const buildings = database.collection('buildings')
const users = database.collection('user')
await flats.createIndex(
  { buildingId: 1, flatNumber: 1 },
  { unique: true },
  {}
)



const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
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

app.get('/', (req, res) => {
  res.send('Hello World!');
});



// Flat Owner
app.post('/flat-owner/flats', verifyToken, verifyFlatOwner, async (req, res) => {
  try {
    const data = req.body
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body'
      })
    }

    const requiredFields = [
      'buildingName',
      'flatNumber',
      'floor',
      'gasType',
      'electricityType',
      'monthlyRent',
      'serviceCharge',
      'rentalCategory',
    ]
    const missingFields = requiredFields.filter((field) => {
      const value = data[field]
      return value === undefined || value === null || String(value).trim() === ''
    })
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false, message: 'All required fields must be provided'
      })
    }

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
    const currentDueAmount = optionalNumber(data.currentDueAmount);

    if (
      data.currentDueAmount !== "" &&
      data.currentDueAmount !== null &&
      data.currentDueAmount !== undefined &&
      currentDueAmount === null
    ) {
      return res.status(400).json({
        success: false,
        message: 'Current due amount must be a valid number',
      });
    }

    if (currentDueAmount !== null && currentDueAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current due amount cannot be negative',
      });
    }
    const flatNumber = String(data.flatNumber).trim()
    const monthlyRent = optionalNumber(data.monthlyRent)
    const serviceCharge = optionalNumber(data.serviceCharge)
    if (monthlyRent === null || serviceCharge === null || monthlyRent < 0 || serviceCharge < 0) {
      return res.status(400).json({ success: false, message: 'Monthly rent and service charge must be valid non-negative numbers' })
    }


    const optionalNumberFields = [
      'sizeSqFt',
      'bedrooms',
      'attachedBathrooms',
      'commonBathrooms',
      'balconies',
      'waterBillFixed',
      'garbageBillFixed',
      'securityDeposit',
    ];
    const invalidNumberFields = optionalNumberFields.filter((field) => {
      const value = data[field]
      if (value === "" || value === null || value === undefined) {
        return false
      }
      return !Number.isFinite(Number(value)) || Number(value) < 0

    })
    if (invalidNumberFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Optional number fields must be valid non-negative numbers',
        fields: invalidNumberFields,
      })
    }

    const rawBuildingName = typeof data.buildingName === "string" ? data.buildingName.trim() : "";
    if (!rawBuildingName) {
      return res.status(400).json({ success: false, message: "Building name is required" });
    }
    const buildingName = rawBuildingName;
    const existingBuilding = await buildings.findOne({
      name: buildingName,
      'buildingOwner.email': req.user.email
    })
    let buildingId;
    if (existingBuilding) {
      buildingId = existingBuilding._id
    } else {
      const newAddBuildingResult = await buildings.insertOne({
        name: buildingName,
        buildingOwner: {
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
      buildingName: buildingName,
      flatNumber: flatNumber,
      floor: data.floor,
      gasType: data.gasType,
      electricityType: data.electricityType,
      monthlyRent: monthlyRent,
      serviceCharge: serviceCharge,
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

      flatOwner: {
        _id: req.user._id,
        name: req.user.name ?? null,
        email: req.user.email,
        phone: req.user.phone ?? null,
        address: req.user.address ?? null,
      },
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


      // Booleans (checkbox)
      hasDrawingDining: optionalBoolean(data.hasDrawingDining),
      hasServantRoom: optionalBoolean(data.hasServantRoom),
      hasParking: optionalBoolean(data.hasParking),
      hasLift: optionalBoolean(data.hasLift),
      hasGenerator: optionalBoolean(data.hasGenerator),

      // Defaults
      currentDueAmount: currentDueAmount ?? 0,
      currentMonthBillStatus: data.currentMonthBillStatus ?? "N/A",
      presentTenants: data.presentTenants ?? [],
      pastTenants: data.pastTenants ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // const duplicateFlats = await flats.findOne({
    //   buildingId,
    //   flatNumber: optionalString(data.flatNumber)
    // })
    // if (duplicateFlats) {
    //   return res.status(409).json({ success: false, message: 'Flat already exists in this building' })
    // }

    const result = await flats.insertOne(dataToInsertInFlats)
    if (!result.acknowledged || !result.insertedId) {
      return res.status(500).json({ success: false, message: "Insert not acknowledged" });
    }

    res.send(result)

  } catch (err) {
    console.error("POST /flat-owner/flats failed:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Flat already exists in this building'
      })
    }
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