export declare enum UserRole {
  user = 'user',
  consultant = 'consultant',
  content_manager = 'content_manager',
  admin = 'admin',
}
export declare enum ContentType {
  article = 'article',
  video = 'video',
  minibook = 'minibook',
  static_page = 'static_page',
  faq = 'faq',
}
export declare enum ContentStatus {
  draft = 'draft',
  review = 'review',
  published = 'published',
  archived = 'archived',
}
export declare enum ContentVisibility {
  public = 'public',
  authenticated = 'authenticated',
  course_only = 'course_only',
  admin_only = 'admin_only',
}
export declare enum CourseStatus {
  draft = 'draft',
  review = 'review',
  published = 'published',
  archived = 'archived',
}
export declare enum ConsultationType {
  accounting = 'accounting',
  tax = 'tax',
  general = 'general',
}
export declare enum ConsultationStatus {
  pending = 'pending',
  contacted = 'contacted',
  scheduled = 'scheduled',
  completed = 'completed',
  canceled = 'canceled',
  no_response = 'no_response',
  rejected = 'rejected',
}
export declare enum OrderStatus {
  pending = 'pending',
  waiting_for_call = 'waiting_for_call',
  waiting_for_payment = 'waiting_for_payment',
  confirmed = 'confirmed',
  rejected = 'rejected',
  canceled = 'canceled',
  refunded = 'refunded',
  expired = 'expired',
}
export declare enum OrderItemType {
  course = 'course',
  consultation = 'consultation',
}
