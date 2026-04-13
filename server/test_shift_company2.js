import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config();

const getAssignedShiftIds = (employee) => {
    const shiftIds = Array.isArray(employee?.shift_ids)
        ? employee.shift_ids.map((id) => String(id?._id || id)).filter(Boolean)
        : [];

    if (shiftIds.length > 0) return shiftIds;
    if (employee?.shift_id) return [String(employee.shift_id?._id || employee.shift_id)];
    return [];
};

console.log(getAssignedShiftIds({
    _id: "test",
    company_id: new mongoose.Types.ObjectId("69cd1e3b50e6c73acc73a91e"),
    shift_id: new mongoose.Types.ObjectId("69cd1e3b50e6c73acc73a919")
}));
