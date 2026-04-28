export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum JobStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  TRANSCRIBED = 'TRANSCRIBED',
  REVIEWED = 'REVIEWED',
  COMPLETED = 'COMPLETED',
}

export enum JobLocationType {
  PHYSICAL = 'PHYSICAL',
  REMOTE = 'REMOTE',
}

export enum AssignmentType {
  REPORTER = 'REPORTER',
  EDITOR = 'EDITOR',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}
