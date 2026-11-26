import type { Request, Response } from 'express';
import type { Collection, Document, ObjectId, WithId } from 'mongodb';

interface UserRecord extends Document {
    _id: ObjectId;
    name?: string | null;
    email: string;
    phone?: string | null;
    address?: string | null;
}

interface BuildingRecord extends Document {}

interface MatchedFlat extends Document {
    buildingId?: ObjectId | string;
    buildingName?: string;
    flatNumber?: string;
    floor?: string;
    gasType?: string;
    electricityType?: string;
    monthlyRent?: number;
    serviceCharge?: number;
    rentalCategory?: string;
    status?: string;
    attachedBathrooms?: number;
    commonBathrooms?: number;
}

export const validateFields = async (
    _req: Request,
    res: Response,
    data: Record<string, unknown> | null | undefined,
    user: UserRecord,
    existingBuilding: WithId<BuildingRecord> | null,
    buildings: Collection<BuildingRecord>,
    method: 'POST' | 'PATCH',
    matchedFlat: MatchedFlat | null = null
): Promise<{ data: Document } | null> => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.status(400).json({
            success: false,
            message: 'Invalid request body'
        });
        return null;
    }

    const isPatch = method === 'PATCH';

    const requiredFields = [
        'buildingName',
        'flatNumber',
        'floor',
        'gasType',
        'electricityType',
        'monthlyRent',
        'serviceCharge',
        'rentalCategory',
    ];

  
    const missingFields = isPatch
        ? requiredFields.filter((field) => {
            if (data[field] === undefined) return false;
            return data[field] === null || String(data[field]).trim() === '';
        })
        : requiredFields.filter((field) => {
            const value = data[field];
            return value === undefined || value === null || String(value).trim() === '';
        });

    if (missingFields.length > 0) {
        res.status(400).json({
            success: false,
            message: isPatch
                ? 'Provided required fields cannot be empty'
                : 'All required fields must be provided',
            fields: missingFields
        });
        return null;
    }

    const optionalNumber = (value: unknown) => {
        if (value === "" || value === null || value === undefined) {
            return null;
        }
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    };

    const optionalString = (value: unknown) => {
        if (value === null || value === undefined) {
            return null;
        }
        const str = String(value).trim();
        return str === "" ? null : str;
    };

    const optionalBoolean = (value: unknown) => {
        return value === true || value === "on" || value === "true";
    };

    // Current due amount validation (শুধু পাঠানো হলে বা POST-এ)
    const hasCurrentDue = data.currentDueAmount !== undefined;
    const currentDueAmount = hasCurrentDue ? optionalNumber(data.currentDueAmount) : null;

    if (
        hasCurrentDue &&
        data.currentDueAmount !== "" &&
        data.currentDueAmount !== null &&
        currentDueAmount === null
    ) {
        res.status(400).json({
            success: false,
            message: 'Current due amount must be a valid number',
        });
        return null;
    }

    if (currentDueAmount !== null && currentDueAmount < 0) {
        res.status(400).json({
            success: false,
            message: 'Current due amount cannot be negative',
        });
        return null;
    }

    // Monthly rent & service charge validation
    const rawMonthlyRent = data.monthlyRent !== undefined
        ? data.monthlyRent
        : matchedFlat?.monthlyRent;
    const rawServiceCharge = data.serviceCharge !== undefined
        ? data.serviceCharge
        : matchedFlat?.serviceCharge;

    const monthlyRent = optionalNumber(rawMonthlyRent);
    const serviceCharge = optionalNumber(rawServiceCharge);

    if (
        monthlyRent === null ||
        serviceCharge === null ||
        monthlyRent < 0 ||
        serviceCharge < 0
    ) {
        res.status(400).json({
            success: false,
            message: 'Monthly rent and service charge must be valid non-negative numbers'
        });
        return null;
    }

    // Optional numeric fields validation (শুধু পাঠানো ফিল্ড চেক হবে)
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
        const value = data[field];
        if (value === "" || value === null || value === undefined) {
            return false;
        }
        return !Number.isFinite(Number(value)) || Number(value) < 0;
    });

    if (invalidNumberFields.length > 0) {
        res.status(400).json({
            success: false,
            message: 'Optional number fields must be valid non-negative numbers',
            fields: invalidNumberFields,
        });
        return null;
    }

    // Building name & buildingId
    const rawBuildingName = typeof data.buildingName === "string"
        ? data.buildingName.trim()
        : (isPatch ? matchedFlat?.buildingName ?? "" : "");

    if (!rawBuildingName) {
        res.status(400).json({
            success: false,
            message: "Building name is required"
        });
        return null;
    }

    const buildingName = rawBuildingName;

    let buildingId;
    if (matchedFlat && buildingName === matchedFlat.buildingName) {
        buildingId = matchedFlat.buildingId;
    } else if (existingBuilding) {
        buildingId = existingBuilding._id;
    } else {
        const newAddBuildingResult = await buildings.insertOne({
            name: buildingName,
            buildingOwner: {
                _id: user._id,
                name: user.name ?? null,
                email: user.email,
                phone: user.phone ?? '',
                address: user.address ?? ''
            },
            createdAt: new Date(),
        });
        buildingId = newAddBuildingResult.insertedId;
    }

    const flatNumber = String(
        data.flatNumber !== undefined ? data.flatNumber : (matchedFlat?.flatNumber ?? '')
    ).trim();

    const attachedBathroomsVal = data.attachedBathrooms !== undefined
        ? optionalNumber(data.attachedBathrooms)
        : (matchedFlat?.attachedBathrooms ?? null);

    const commonBathroomsVal = data.commonBathrooms !== undefined
        ? optionalNumber(data.commonBathrooms)
        : (matchedFlat?.commonBathrooms ?? null);

    return {
        data: {
            buildingId,
            buildingName,
            flatNumber,
            floor: String(
                data.floor !== undefined ? data.floor : (matchedFlat?.floor ?? '')
            ).trim(),
            gasType: data.gasType !== undefined ? data.gasType : matchedFlat?.gasType,
            electricityType: data.electricityType !== undefined
                ? data.electricityType
                : matchedFlat?.electricityType,

            monthlyRent,
            serviceCharge,

            rentalCategory: data.rentalCategory !== undefined
                ? data.rentalCategory
                : matchedFlat?.rentalCategory,
            status: data.status !== undefined
                ? data.status
                : (matchedFlat?.status ?? 'Vacant'),

            flatImage: data.flatImage !== undefined
                ? data.flatImage
                : (matchedFlat?.flatImage ?? null),
            buildingImage: data.buildingImage !== undefined
                ? data.buildingImage
                : (matchedFlat?.buildingImage ?? null),

            sizeSqFt: data.sizeSqFt !== undefined
                ? optionalNumber(data.sizeSqFt)
                : (matchedFlat?.sizeSqFt ?? null),
            bedrooms: data.bedrooms !== undefined
                ? optionalNumber(data.bedrooms)
                : (matchedFlat?.bedrooms ?? null),
            attachedBathrooms: attachedBathroomsVal,
            commonBathrooms: commonBathroomsVal,
            balconies: data.balconies !== undefined
                ? optionalNumber(data.balconies)
                : (matchedFlat?.balconies ?? null),
            waterBillFixed: data.waterBillFixed !== undefined
                ? optionalNumber(data.waterBillFixed)
                : (matchedFlat?.waterBillFixed ?? null),
            garbageBillFixed: data.garbageBillFixed !== undefined
                ? optionalNumber(data.garbageBillFixed)
                : (matchedFlat?.garbageBillFixed ?? null),
            securityDeposit: data.securityDeposit !== undefined
                ? optionalNumber(data.securityDeposit)
                : (matchedFlat?.securityDeposit ?? null),

            totalBathRooms: (attachedBathroomsVal ?? 0) + (commonBathroomsVal ?? 0),

            facing: data.facing !== undefined
                ? optionalString(data.facing)
                : (matchedFlat?.facing ?? null),
            gasMeterOrAccountNo: data.gasMeterOrAccountNo !== undefined
                ? optionalString(data.gasMeterOrAccountNo)
                : (matchedFlat?.gasMeterOrAccountNo ?? null),
            electricityMeterNo: data.electricityMeterNo !== undefined
                ? optionalString(data.electricityMeterNo)
                : (matchedFlat?.electricityMeterNo ?? null),
            parkingSlotNo: data.parkingSlotNo !== undefined
                ? optionalString(data.parkingSlotNo)
                : (matchedFlat?.parkingSlotNo ?? null),
            notes: data.notes !== undefined
                ? optionalString(data.notes)
                : (matchedFlat?.notes ?? null),

            hasDrawingDining: data.hasDrawingDining !== undefined
                ? optionalBoolean(data.hasDrawingDining)
                : Boolean(matchedFlat?.hasDrawingDining),
            hasServantRoom: data.hasServantRoom !== undefined
                ? optionalBoolean(data.hasServantRoom)
                : Boolean(matchedFlat?.hasServantRoom),
            hasParking: data.hasParking !== undefined
                ? optionalBoolean(data.hasParking)
                : Boolean(matchedFlat?.hasParking),
            hasLift: data.hasLift !== undefined
                ? optionalBoolean(data.hasLift)
                : Boolean(matchedFlat?.hasLift),
            hasGenerator: data.hasGenerator !== undefined
                ? optionalBoolean(data.hasGenerator)
                : Boolean(matchedFlat?.hasGenerator),

            currentDueAmount: hasCurrentDue
                ? (currentDueAmount ?? 0)
                : (matchedFlat?.currentDueAmount ?? 0),
            currentMonthBillStatus: data.currentMonthBillStatus !== undefined
                ? data.currentMonthBillStatus
                : (matchedFlat?.currentMonthBillStatus ?? 'N/A'),
            presentTenants: data.presentTenants !== undefined
                ? data.presentTenants
                : (matchedFlat?.presentTenants ?? []),
            pastTenants: data.pastTenants !== undefined
                ? data.pastTenants
                : (matchedFlat?.pastTenants ?? []),
        }
    };
};