export interface User {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'consultant' | 'content_manager' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface Content {
  id: number;
  contentType: 'article' | 'video' | 'minibook' | 'faq' | 'static_page';
  title: string;
  slug: string;
  summary: string;
  body: string;
  metaDescription: string;
  tags: string;
  mediaUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
  pageCount: number;
  authorId: number | null;
  categoryId: number | null;
  status: 'draft' | 'review' | 'published' | 'archived';
  visibility: 'public' | 'authenticated' | 'course_only' | 'admin_only';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: number; firstName: string; lastName: string };
  reviewer?: { id: number; firstName: string; lastName: string };
  category?: { id: number; name: string; slug: string };
  authorName?: string;
  categoryName?: string;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  status: string;
  videos?: CourseVideo[];
  isEnrolled?: boolean;
  publishedAt: string | null;
}

export interface CourseVideo {
  id: number;
  title: string;
  url: string;
  duration: number;
  isSample: boolean;
  sortOrder: number;
}

export interface Order {
  id: number;
  itemType: 'course' | 'consultation';
  itemId: number;
  amount: number;
  status: 'pending' | 'waiting_for_call' | 'waiting_for_payment' | 'confirmed' | 'rejected' | 'canceled';
  createdAt: string;
}

export interface ConsultationRequest {
  id: number;
  requestType: 'accounting' | 'tax' | 'general';
  description: string;
  preferredTime?: string;
  status: 'pending' | 'contacted' | 'scheduled' | 'completed' | 'canceled' | 'no_response' | 'rejected';
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNew: boolean;
}

export interface UploadResponse {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}
