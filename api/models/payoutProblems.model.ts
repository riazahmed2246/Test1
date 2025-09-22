import mongoose, { Schema, Document } from 'mongoose';

export interface IPayoutProblems extends Document {
  status: string;
  orderId: string;
  userId: string;
  postId?: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutProblemsSchema: Schema = new Schema({
  status: { type: String, required: true },
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  postId: { type: String },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPayoutProblems>('PayoutProblems', PayoutProblemsSchema);
