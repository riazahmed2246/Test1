import mongoose, { Schema, Document } from 'mongoose';

export interface IGitHub extends Document {
  login?: string;
  name?: string;
  token: string;
  jobId?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const GitHubSchema: Schema = new Schema({
  login: { type: String },
  name: { type: String },
  token: { type: String, required: true },
  jobId: { type: String },
  organizationId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IGitHub>('GitHub', GitHubSchema);
