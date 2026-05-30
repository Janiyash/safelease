import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ComplaintCategory = 'maintenance' | 'noise' | 'security' | 'cleanliness' | 'billing' | 'other';

export interface IComment {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  message: string;
  attachments: string[];
  createdAt: Date;
}

export interface IComplaint extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  raisedBy: mongoose.Types.ObjectId;
  property: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  attachments: string[];
  comments: IComment[];
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, required: true },
  message: { type: String, required: true, trim: true },
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
});

const ComplaintSchema = new Schema<IComplaint>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true },
  category: { type: String, enum: ['maintenance','noise','security','cleanliness','billing','other'], required: true },
  priority: { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  status: { type: String, enum: ['pending','in_progress','resolved','closed'], default: 'pending' },
  raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  attachments: [String],
  comments: [CommentSchema],
  resolvedAt: Date,
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolutionNote: String,
}, { timestamps: true });

ComplaintSchema.index({ property: 1, status: 1 });
ComplaintSchema.index({ raisedBy: 1 });
ComplaintSchema.index({ status: 1, priority: 1 });

export const Complaint = mongoose.model<IComplaint>('Complaint', ComplaintSchema);
