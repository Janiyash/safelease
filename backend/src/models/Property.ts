import mongoose, { Document, Schema } from 'mongoose';

export type PropertyStatus = 'available' | 'rented' | 'maintenance' | 'pending_approval';

export interface IProperty extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  amenities: string[];
  images: string[];
  status: PropertyStatus;
  isApproved: boolean;
  owner: mongoose.Types.ObjectId;
  tenant?: mongoose.Types.ObjectId;
  description: string;
  hazardScore: number;
  lastInspected?: Date;
  availableFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>({
  title: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true },
  rent: { type: Number, required: true, min: 0 },
  deposit: { type: Number, required: true, min: 0 },
  bedrooms: { type: Number, required: true, min: 0 },
  bathrooms: { type: Number, required: true, min: 0 },
  sqft: { type: Number, required: true, min: 0 },
  amenities: [{ type: String }],
  images: [{ type: String }],
  status: { type: String, enum: ['available','rented','maintenance','pending_approval'], default: 'pending_approval' },
  isApproved: { type: Boolean, default: false },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tenant: { type: Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, trim: true },
  hazardScore: { type: Number, default: 100, min: 0, max: 100 },
  lastInspected: Date,
  availableFrom: { type: Date, default: Date.now },
}, { timestamps: true });

PropertySchema.index({ owner: 1 });
PropertySchema.index({ tenant: 1 });
PropertySchema.index({ status: 1, isApproved: 1 });
PropertySchema.index({ city: 1, state: 1 });

export const Property = mongoose.model<IProperty>('Property', PropertySchema);
