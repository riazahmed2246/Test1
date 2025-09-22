import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhooks extends Document {
  name: string;
  organizationId: string;
  url: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhooksSchema: Schema = new Schema({
  name: { type: String, required: true },
  organizationId: { type: String, required: true },
  url: { type: String, required: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWebhooks>('Webhooks', WebhooksSchema);
