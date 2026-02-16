"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatus = exports.UserRole = exports.PredictionStatus = exports.TrainingStatus = exports.DockingStatus = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    NotificationType["SUCCESS"] = "SUCCESS";
    NotificationType["ERROR"] = "ERROR";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var DockingStatus;
(function (DockingStatus) {
    DockingStatus["PROCESSING"] = "processing";
    DockingStatus["SUCCESS"] = "success";
    DockingStatus["FAILURE"] = "failure";
})(DockingStatus || (exports.DockingStatus = DockingStatus = {}));
var TrainingStatus;
(function (TrainingStatus) {
    TrainingStatus["PROCESSING"] = "processing";
    TrainingStatus["SUCCESS"] = "success";
    TrainingStatus["FAILURE"] = "failure";
})(TrainingStatus || (exports.TrainingStatus = TrainingStatus = {}));
var PredictionStatus;
(function (PredictionStatus) {
    PredictionStatus["PROCESSING"] = "processing";
    PredictionStatus["SUCCESS"] = "success";
    PredictionStatus["FAILURE"] = "failure";
})(PredictionStatus || (exports.PredictionStatus = PredictionStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["USER"] = "user";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["PENDING"] = "pending";
    UserStatus["VERIFIED"] = "verified";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
