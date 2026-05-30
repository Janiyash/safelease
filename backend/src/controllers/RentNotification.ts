import mongoose, { Document, Schema } from 'mongoose';

export type RentNotifType =
  | 'UPCOMING_REMINDER'
  | 'DUE_TODAY_REMINDER'
  | 'OVERDUE_ALERT';

export type RentNotifStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'RETRYING';

export interface IRentNotification extends Document {
  _id:         mongoose.Types.ObjectId;
  tenantId:    mongoose.Types.ObjectId;
  paymentId:   mongoose.Types.ObjectId;
  type:        RentNotifType;
  title:       string;
  message:     string;
  status:      RentNotifStatus;
  retryCount:  number;
  maxRetries:  number;
  sentAt?:     Date;
  failedAt?:   Date;
  nextRetryAt?: Date;
  errorMsg?:   string;
  createdAt:   Date;
  updatedAt:   Date;
}

const RentNotificationSchema = new Schema<IRentNotification>({
  tenantId:   { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  paymentId:  { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  type:       { type: String, enum: ['UPCOMING_REMINDER','DUE_TODAY_REMINDER','OVERDUE_ALERT'], required: true },
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  status:     { type: String, enum: ['QUEUED','SENT','FAILED','RETRYING'], default: 'QUEUED' },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  sentAt:     { type: Date },
  failedAt:   { type: Date },
  nextRetryAt:{ type: Date },
  errorMsg:   { type: String },
}, { timestamps: true });

// Idempotency: one notification per (payment, type)
RentNotificationSchema.index({ paymentId: 1, type: 1 }, { unique: true });
RentNotificationSchema.index({ tenantId: 1, status: 1 });
RentNotificationSchema.index({ status: 1, nextRetryAt: 1 });
RentNotificationSchema.index({ createdAt: -1 });

export const RentNotification = mongoose.model<IRentNotification>('RentNotification', RentNotificationSchema);
