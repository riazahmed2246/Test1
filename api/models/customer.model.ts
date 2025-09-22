import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const CustomerSchema: Schema = new Schema({
  name: { type: String, required: true },
  orgId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
