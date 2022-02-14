module.exports = function forbiddenException(message) {
  this.status = 403;
  this.message = message || 'inactive_authentification_failure';
};
