import mongoose, { Schema, Document } from 'mongoose';

export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface IUserOrganization extends Document {
  userId: string;
  organizationId: string;
  disabled: boolean;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const UserOrganizationSchema: Schema = new Schema({
  userId: { type: String, required: true },
  organizationId: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  role: { type: String, enum: Object.values(Role), default: Role.USER },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUserOrganization>('UserOrganization', UserOrganizationSchema);
