export interface User {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}
export interface Content {
  id: number;
  contentType: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  mediaUrl: string;
  authorId: number;
  categoryId: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  itemType: string;
  itemId: number;
  amount: number;
  status: string;
  createdAt: string;
}
export interface ConsultationRequest {
  id: number;
  requestType: string;
  description: string;
  preferredTime?: string;
  status: string;
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
