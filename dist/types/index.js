"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VIDEO_NOT_FOUND"] = "VIDEO_NOT_FOUND";
    ErrorCode["DOWNLOAD_FAILED"] = "DOWNLOAD_FAILED";
    ErrorCode["BROKEN_LINK"] = "BROKEN_LINK";
    ErrorCode["REGION_RESTRICTED"] = "REGION_RESTRICTED";
    ErrorCode["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    ErrorCode["NO_ACTIVE_SESSION"] = "NO_ACTIVE_SESSION";
    ErrorCode["INVALID_INDEX"] = "INVALID_INDEX";
    ErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorCode["UNKNOWN"] = "UNKNOWN";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class BotError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'BotError';
    }
}
exports.BotError = BotError;
//# sourceMappingURL=index.js.map