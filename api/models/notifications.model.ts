import mongoose, { Schema, Document } from 'mongoose';

export interface INotifications extends Document {
  organizationId: string;
  content: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const NotificationsSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  content: { type: String, required: true },
  link: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<INotifications>('Notifications', NotificationsSchema);
