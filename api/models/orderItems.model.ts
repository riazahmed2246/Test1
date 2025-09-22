import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItems extends Document {
  orderId: string;
  integrationId: string;
  quantity: number;
  price: number;
}

const OrderItemsSchema: Schema = new Schema({
  orderId: { type: String, required: true },
  integrationId: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

export default mongoose.model<IOrderItems>('OrderItems', OrderItemsSchema);
