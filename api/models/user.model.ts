import mongoose, { Schema, Document } from 'mongoose';

export enum Provider {
  LOCAL = 'LOCAL',
  GITHUB = 'GITHUB',
  GOOGLE = 'GOOGLE',
  FARCASTER = 'FARCASTER',
  WALLET = 'WALLET',
  GENERIC = 'GENERIC',
}

export interface IUser extends Document {
  email: string;
  password?: string;
  providerName: Provider;
  name?: string;
  lastName?: string;
  isSuperAdmin: boolean;
  bio?: string;
  audience: number;
  timezone: number;
  marketplace: boolean;
  connectedAccount: boolean;
  account?: string;
  lastOnline: Date;
  activated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true },
  password: { type: String },
  providerName: { type: String, enum: Object.values(Provider), required: true },
  name: { type: String },
  lastName: { type: String },
  isSuperAdmin: { type: Boolean, default: false },
  bio: { type: String },
  audience: { type: Number, default: 0 },
  timezone: { type: Number },
  marketplace: { type: Boolean, default: true },
  connectedAccount: { type: Boolean, default: false },
  account: { type: String },
  lastOnline: { type: Date, default: Date.now },
  activated: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
