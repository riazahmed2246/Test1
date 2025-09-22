import mongoose, { Schema, Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
}

export interface IOrders extends Document {
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  messageGroupId: string;
  captureId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrdersSchema: Schema = new Schema({
  buyerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  status: { type: String, enum: Object.values(OrderStatus), required: true },
  messageGroupId: { type: String, required: true },
  captureId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOrders>('Orders', OrdersSchema);
