'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.OrderItemType =
  exports.OrderStatus =
  exports.ConsultationStatus =
  exports.ConsultationType =
  exports.CourseStatus =
  exports.ContentVisibility =
  exports.ContentStatus =
  exports.ContentType =
  exports.UserRole =
    void 0;
var UserRole;
(function (UserRole) {
  UserRole['user'] = 'user';
  UserRole['consultant'] = 'consultant';
  UserRole['content_manager'] = 'content_manager';
  UserRole['admin'] = 'admin';
})(UserRole || (exports.UserRole = UserRole = {}));
var ContentType;
(function (ContentType) {
  ContentType['article'] = 'article';
  ContentType['video'] = 'video';
  ContentType['minibook'] = 'minibook';
  ContentType['static_page'] = 'static_page';
  ContentType['faq'] = 'faq';
})(ContentType || (exports.ContentType = ContentType = {}));
var ContentStatus;
(function (ContentStatus) {
  ContentStatus['draft'] = 'draft';
  ContentStatus['review'] = 'review';
  ContentStatus['published'] = 'published';
  ContentStatus['archived'] = 'archived';
})(ContentStatus || (exports.ContentStatus = ContentStatus = {}));
var ContentVisibility;
(function (ContentVisibility) {
  ContentVisibility['public'] = 'public';
  ContentVisibility['authenticated'] = 'authenticated';
  ContentVisibility['course_only'] = 'course_only';
  ContentVisibility['admin_only'] = 'admin_only';
})(ContentVisibility || (exports.ContentVisibility = ContentVisibility = {}));
var CourseStatus;
(function (CourseStatus) {
  CourseStatus['draft'] = 'draft';
  CourseStatus['review'] = 'review';
  CourseStatus['published'] = 'published';
  CourseStatus['archived'] = 'archived';
})(CourseStatus || (exports.CourseStatus = CourseStatus = {}));
var ConsultationType;
(function (ConsultationType) {
  ConsultationType['accounting'] = 'accounting';
  ConsultationType['tax'] = 'tax';
  ConsultationType['general'] = 'general';
})(ConsultationType || (exports.ConsultationType = ConsultationType = {}));
var ConsultationStatus;
(function (ConsultationStatus) {
  ConsultationStatus['pending'] = 'pending';
  ConsultationStatus['contacted'] = 'contacted';
  ConsultationStatus['scheduled'] = 'scheduled';
  ConsultationStatus['completed'] = 'completed';
  ConsultationStatus['canceled'] = 'canceled';
  ConsultationStatus['no_response'] = 'no_response';
  ConsultationStatus['rejected'] = 'rejected';
})(ConsultationStatus || (exports.ConsultationStatus = ConsultationStatus = {}));
var OrderStatus;
(function (OrderStatus) {
  OrderStatus['pending'] = 'pending';
  OrderStatus['waiting_for_call'] = 'waiting_for_call';
  OrderStatus['waiting_for_payment'] = 'waiting_for_payment';
  OrderStatus['confirmed'] = 'confirmed';
  OrderStatus['rejected'] = 'rejected';
  OrderStatus['canceled'] = 'canceled';
  OrderStatus['refunded'] = 'refunded';
  OrderStatus['expired'] = 'expired';
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderItemType;
(function (OrderItemType) {
  OrderItemType['course'] = 'course';
  OrderItemType['consultation'] = 'consultation';
})(OrderItemType || (exports.OrderItemType = OrderItemType = {}));
//# sourceMappingURL=index.js.map
