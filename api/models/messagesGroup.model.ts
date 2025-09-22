import mongoose, { Schema, Document } from 'mongoose';

export interface IMessagesGroup extends Document {
  buyerOrganizationId: string;
  buyerId: string;
  sellerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessagesGroupSchema: Schema = new Schema({
  buyerOrganizationId: { type: String, required: true },
  buyerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMessagesGroup>('MessagesGroup', MessagesGroupSchema);
