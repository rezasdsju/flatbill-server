export type FlatStatus = 'Occupied' | 'Vacant' | 'Under Maintenance';
export type BillStatus = 'Paid' | 'Due' | 'Partial' | 'N/A';
export type GasType = 'Titas Line' | 'Prepaid Meter' | 'Cylinder';
export type ElectricityType = 'Prepaid' | 'Postpaid' | 'Sub-meter';
export type RentalCategory = 'Family' | 'Bachelor' | 'Office' | 'Sublet';
export type FacingDirection =
    | 'South'
    | 'North'
    | 'East'
    | 'West'
    | 'South-East'
    | 'South-West';

export interface UserSummary {
    _id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    nid?: string;
}

export interface PastTenantRecord extends UserSummary {
    moveInDate: string;
    moveOutDate: string;
}

export interface PresentTenantRecord extends UserSummary {
    moveInDate: string;
    leaseEndDate?: string;
    roomOrSeatLabel?: string;
}

export interface IFlat {
    _id: string;
    buildingId: string;
    buildingName: string;
    flatNumber: string;
    floor: string;
    facing?: FacingDirection;

    sizeSqFt: number;
    bedrooms: number;
    totalBathRooms: number;
    attachedBathrooms: number;
    commonBathrooms: number;
    balconies: number;
    hasDrawingDining: boolean;
    hasServantRoom?: boolean;
    flatImage?: string;
    buildingImage?: string;

    gasType: GasType;
    gasMeterOrAccountNo?: string;
    electricityType: ElectricityType;
    electricityMeterNo?: string;
    hasParking: boolean;
    parkingSlotNo?: string;
    hasLift: boolean;
    hasGenerator: boolean;

    monthlyRent: number;
    serviceCharge: number;
    waterBillFixed?: number;
    garbageBillFixed?: number;
    securityDeposit: number;
    currentDueAmount: number;
    currentMonthBillStatus: BillStatus;

    rentalCategory: RentalCategory;
    status: FlatStatus;
    flatOwner: UserSummary;
    presentTenants?: PresentTenantRecord[];
    pastTenants?: PastTenantRecord[];

    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IAddFlat {
    buildingId?: string;
    buildingName: string;
    flatNumber: string;
    floor: string;
    rentalCategory: RentalCategory;
    monthlyRent: number;
    serviceCharge: number;
    status: FlatStatus;
    gasType: GasType;
    electricityType: ElectricityType;

    sizeSqFt?: number;
    facing?: FacingDirection;
    bedrooms?: number;
    attachedBathrooms?: number;
    commonBathrooms?: number;
    balconies?: number;
    hasDrawingDining?: boolean;
    hasServantRoom?: boolean;

    gasMeterOrAccountNo?: string;
    electricityMeterNo?: string;
    hasParking?: boolean;
    parkingSlotNo?: string;
    hasLift?: boolean;
    hasGenerator?: boolean;

    securityDeposit?: number;
    waterBillFixed?: number;
    garbageBillFixed?: number;
    notes?: string;
    flatImage?: string;
    buildingImage?: string;
}
