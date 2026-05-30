import mongoose, { Document, Schema } from 'mongoose';

export type NoticeCategory = 'general' | 'emergency' | 'maintenance' | 'event' | 'billing';

export interface INotice extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  category: NoticeCategory;
  author: mongoose.Types.ObjectId;
  property?: mongoose.Types.ObjectId;
  isGlobal: boolean;
  expiresAt?: Date;
  isPinned: boolean;
  readBy: mongoose.Types.ObjectId[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  category: { type: String, enum: ['general','emergency','maintenance','event','billing'], default: 'general' },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: Schema.Types.ObjectId, ref: 'Property' },
  isGlobal: { type: Boolean, default: false },
  expiresAt: Date,
  isPinned: { type: Boolean, default: false },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  attachments: [String],
}, { timestamps: true });

NoticeSchema.index({ property: 1, createdAt: -1 });
NoticeSchema.index({ isGlobal: 1 });

export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);
